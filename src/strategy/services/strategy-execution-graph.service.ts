import { END, GraphNode, START, StateGraph } from '@langchain/langgraph';
import { BadRequestException, Injectable } from '@nestjs/common';

import { StrategyRunProgressService } from './strategy-run-progress.service';
import { StrategyExecutionNodeService } from './strategy-execution-node.service';

import { StrategyEntity } from '../entities/strategy.entity';

import {
  StrategyRunResult,
  StrategyRunStepResult,
} from '../types/strategy-run-result.type';
import {
  StrategyGraphState,
  StrategyGraphStateSchema,
} from '../types/graph/strategy-graph-state.type';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';

@Injectable()
export class StrategyExecutionGraphService {
  constructor(
    private readonly nodes: StrategyExecutionNodeService,
    private readonly progress: StrategyRunProgressService,
  ) {}

  private readonly maxAiDecisionAttempts = 3;

  async run(input: {
    strategy: StrategyEntity;
    strategyRunId: number;
  }): Promise<StrategyRunResult> {
    const graph = this.createGraph();

    // 실행 시작 시 graph snapshot 초기화
    await this.progress.reset(input.strategyRunId);

    // graph 실행 시작
    const finalState = await graph.invoke({
      strategy: input.strategy,
      strategyRunId: input.strategyRunId,
      steps: [],
      collectedSteps: [],
    });

    if (!finalState.result) {
      throw new BadRequestException('전략 실행 결과가 생성되지 않습니다.');
    }

    return finalState.result;
  }

  // 그래프 생성
  private createGraph() {
    return new StateGraph(StrategyGraphStateSchema)
      .addNode('prepare', this.prepareNode)
      .addNode('collect', this.collectNode)
      .addNode('decideAi', this.aiDecisionNode)
      .addNode('checkRisk', this.riskCheckNode)
      .addNode('order', this.orderNode)
      .addNode('finish', this.finishNode)
      .addEdge(START, 'prepare')
      .addEdge('prepare', 'collect')
      .addEdge('collect', 'decideAi')
      .addEdge('decideAi', 'checkRisk')
      .addConditionalEdges('checkRisk', this.routeAfterRiskCheck, {
        retryAiDecision: 'decideAi',
        order: 'order',
      })
      .addEdge('order', 'finish')
      .addEdge('finish', END)
      .compile();
  }
  private readonly prepareNode: GraphNode<typeof StrategyGraphStateSchema> = (
    state,
  ) => {
    const structuredStrategy = state.strategy.structuredStrategy;

    if (!isStructuredStrategy(structuredStrategy)) {
      throw new BadRequestException(
        '구조화되지 않은 전략은 실행할 수 없습니다.',
      );
    }

    // 다음 node들이 사용할 structuredStrategy를 state에 저장
    return { structuredStrategy };
  };

  private readonly collectNode: GraphNode<typeof StrategyGraphStateSchema> =
    async (state) => {
      const structuredStrategy = state.structuredStrategy!;

      // 기존 수집 로직을 node service로 호출
      const marketDataStep = await this.nodes.collectMarketData(
        state.strategyRunId,
        structuredStrategy,
      );
      const portfolioStep = await this.nodes.collectPortfolio(
        state.strategyRunId,
        state.strategy,
      );
      const newsStep = await this.nodes.collectNews(
        state.strategyRunId,
        structuredStrategy,
      );
      const assetSummaryStep = await this.nodes.collectAssetSummary(
        state.strategyRunId,
        state.strategy,
      );

      const collectedSteps = [
        marketDataStep,
        portfolioStep,
        newsStep,
        assetSummaryStep,
      ];

      return {
        collectedSteps,
        steps: [...state.steps, ...collectedSteps],
      };
    };

  private readonly aiDecisionNode: GraphNode<typeof StrategyGraphStateSchema> =
    async (state) => {
      await this.progress.markRunning({
        strategyRunId: state.strategyRunId,
        stepName: 'ai_decision',
        summary: 'AI 판단을 진행 중입니다.',
      });

      try {
        const structuredStrategy = state.structuredStrategy!;
        const collectedSteps = state.collectedSteps;
        const aiDecisionAttempt = state.aiDecisionAttemptCount + 1;

        // risk retry로 돌아온 경우 state.riskCheck에 직전 실패 사유가 남아 있음
        const aiDecision = await this.nodes.decideAi({
          structuredStrategy,
          steps: collectedSteps,
          previousRiskCheck: state.riskCheck,
          aiDecisionAttempt,
        });

        // DB에 남길 실행 로그용 step 생성
        const aiDecisionStep: StrategyRunStepResult = {
          name: 'ai_decision',
          status: 'succeeded',
          summary: aiDecision.reason,
          output: {
            ...aiDecision,
            // 나중에 graph/history에서 몇 번째 AI 판단인지 확인하기 위해 저장
            aiDecisionAttempt,
          },
        };

        await this.progress.markCompleted({
          strategyRunId: state.strategyRunId,
          stepName: 'ai_decision',
          status: 'succeeded',
          summary: aiDecision.reason,
        });

        return {
          aiDecision,
          aiDecisionAttemptCount: aiDecisionAttempt,
          steps: [...state.steps, aiDecisionStep],
        };
      } catch (error) {
        await this.progress.markFailed({
          strategyRunId: state.strategyRunId,
          stepName: 'ai_decision',
          error,
        });

        throw error;
      }
    };

  private readonly riskCheckNode: GraphNode<typeof StrategyGraphStateSchema> =
    async (state) => {
      await this.progress.markRunning({
        strategyRunId: state.strategyRunId,
        stepName: 'risk_check',
        summary: '리스크 체크를 진행 중입니다.',
      });

      try {
        const aiDecision = state.aiDecision!;
        const structuredStrategy = state.structuredStrategy!;

        // AI 판단 결과가 실제 주문 가능한지 검사
        const riskCheck = this.nodes.checkRisk({
          aiDecision,
          strategyMode: state.strategy.strategyMode,
          collectedSteps: state.collectedSteps,
          structuredStrategy,
        });

        const riskCheckStep: StrategyRunStepResult = {
          name: 'risk_check',
          status: 'succeeded',
          summary: riskCheck.reason,
          output: {
            ...riskCheck,
            // 이 risk check가 몇 번째 AI 판단에 대한 검사였는지 기록
            aiDecisionAttempt: state.aiDecisionAttemptCount,
          },
        };

        await this.progress.markCompleted({
          strategyRunId: state.strategyRunId,
          stepName: 'risk_check',
          status: 'succeeded',
          summary: riskCheck.reason,
        });

        return {
          riskCheck,
          steps: [...state.steps, riskCheckStep],
        };
      } catch (error) {
        await this.progress.markFailed({
          strategyRunId: state.strategyRunId,
          stepName: 'risk_check',
          error,
        });

        throw error;
      }
    };

  private readonly orderNode: GraphNode<typeof StrategyGraphStateSchema> =
    async (state) => {
      await this.progress.markRunning({
        strategyRunId: state.strategyRunId,
        stepName: 'order',
        summary: '주문을 진행 중입니다.',
      });

      try {
        const aiDecision = state.aiDecision;
        const riskCheck = state.riskCheck;

        if (!aiDecision || !riskCheck) {
          throw new BadRequestException(
            '주문 생성에 필요한 판단 결과가 없습니다.',
          );
        }

        // risk 결과에 따라 승인 대기, paper 주문, live 주문, 주문 생략 중 하나를 수행
        const orderStep = await this.nodes.decideOrder({
          strategy: state.strategy,
          strategyRunId: state.strategyRunId,
          aiDecision,
          riskCheck,
        });

        await this.progress.markCompleted({
          strategyRunId: state.strategyRunId,
          stepName: 'order',
          status: orderStep.status,
          summary: orderStep.summary,
        });

        return {
          orderStep,
          steps: [...state.steps, orderStep],
        };
      } catch (error) {
        await this.progress.markFailed({
          strategyRunId: state.strategyRunId,
          stepName: 'order',
          error,
        });

        throw error;
      }
    };

  private readonly finishNode: GraphNode<typeof StrategyGraphStateSchema> = (
    state,
  ) => {
    const aiDecision = state.aiDecision;

    if (!aiDecision) {
      throw new BadRequestException(
        '최종 결과를 만들 AI 판단 결과가 없습니다.',
      );
    }

    // StrategyRunService가 DB에 저장할 최종 result 생성
    const result: StrategyRunResult = {
      decision: aiDecision.decision,
      reason: aiDecision.reason,
      confidence: aiDecision.confidence,
      steps: state.steps,
      strategy: {
        id: state.strategy.id,
        market: state.strategy.market,
        intervalMinutes: state.strategy.intervalMinutes,
      },
    };

    return { result };
  };

  private routeAfterRiskCheck = (
    state: StrategyGraphState,
  ): 'retryAiDecision' | 'order' => {
    const riskCheck = state.riskCheck;

    if (!riskCheck) {
      return 'order';
    }

    // risk check를 통과했으면 주문 단계로 이동
    if (riskCheck.passed) {
      return 'order';
    }

    // 실패했지만 AI 판단을 다시 하면 해결 가능한 경우 재시도
    if (
      riskCheck.retryable &&
      state.aiDecisionAttemptCount < this.maxAiDecisionAttempts
    ) {
      return 'retryAiDecision';
    }

    // hold, 필수 데이터 실패, 시도 횟수 초과는 order에서 skipped 처리
    return 'order';
  };
}
