import { Injectable } from '@nestjs/common';

import { NewsDataService } from '@/data-collect/services/news-data.service';
import { UpbitAuthService } from '@/upbit/services/upbit.auth.service';
import { RiskCheckService } from './risk-check.service';
import { LiveOrderService } from '@/upbit/services/live-order.service';
import { PaperOrderService } from '@/paper-trading/services/paper-order.service';
import { AiDecisionService } from './ai-decision.service';
import { UpbitPublicService } from '@/upbit/services/upbit.public.service';
import { UpbitPrivateService } from '@/upbit/services/upbit.private.service';
import { AssetSummaryService } from '@/data-collect/services/asset-summary.service';
import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';
import { StrategyRunProgressService } from './strategy-run-progress.service';
import { StrategyOrderApprovalService } from './strategy-order-approval.service';

import { StrategyEntity } from '../entities/strategy.entity';

import { createNewsQuery } from '@/data-collect/utils/create-query';
import { toUpbitMinuteUnit } from '@/upbit/types/public/upbit-minute-unit.type';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { RiskCheckResult } from '../types/risk-check-result.type';
import { AiDecisionResult } from '../types/ai-decision-result.type';
import { StructuredStrategy } from '../types/structured-strategy.type';
import { StrategyJudgmentMode } from '../enums/strategy-judgment-mode.enum';
import { StrategyRunStepResult } from '../types/strategy-run-result.type';

@Injectable()
export class StrategyExecutionNodeService {
  constructor(
    private readonly progress: StrategyRunProgressService,
    private readonly newsDataService: NewsDataService,
    private readonly approvalService: StrategyOrderApprovalService,
    private readonly upbitAuthService: UpbitAuthService,
    private readonly riskCheckService: RiskCheckService,
    private readonly liveOrderService: LiveOrderService,
    private readonly paperOrderService: PaperOrderService,
    private readonly aiDecisionService: AiDecisionService,
    private readonly upbitPublicService: UpbitPublicService,
    private readonly upbitPrivateService: UpbitPrivateService,
    private readonly assetSummaryService: AssetSummaryService,
    private readonly paperPortfolioService: PaperPortfolioService,
  ) {}

  async collectMarketData(
    strategyRunId: number,
    structuredStrategy: StructuredStrategy,
  ): Promise<StrategyRunStepResult> {
    await this.progress.markRunning({
      strategyRunId: strategyRunId,
      stepName: 'market_data',
      summary: '시장 데이터를 수집 중입니다.',
    });

    try {
      if (!structuredStrategy.dataPermissions.allowMarketData) {
        await this.progress.markCompleted({
          strategyRunId: strategyRunId,
          stepName: 'market_data',
          status: 'skipped',
          summary:
            '전략 설정에서 시장 데이터 조회를 허용하지 않아 생략했습니다.',
        });

        return {
          name: 'market_data',
          status: 'skipped',
          summary:
            '전략 설정에서 시장 데이터 조회를 허용하지 않아 생략했습니다.',
        };
      }

      const market = structuredStrategy.marketDataConfig.symbol;
      const timeframes = structuredStrategy.marketDataConfig.timeframes;

      const candleGroups = await Promise.all(
        timeframes.map(async (timeframe) => {
          const unit = toUpbitMinuteUnit(timeframe);

          const candles = await this.upbitPublicService.getMinuteCandles({
            market,
            unit,
            count: 50,
          });

          return {
            timeframe,
            candleCount: candles.length,
            latestClose: candles[0]?.close ?? null,
            latestOpenedAt: candles[0]?.openedAt ?? null,
            candles,
          };
        }),
      );

      await this.progress.markCompleted({
        strategyRunId: strategyRunId,
        stepName: 'market_data',
        status: 'succeeded',
        summary: '캔들 데이터를 정상적으로 수집하였습니다.',
      });

      return {
        name: 'market_data',
        status: 'succeeded',
        summary: `${market} 캔들 데이터를 ${candleGroups.length}개 timeframe에서 조회했습니다.`,
        output: {
          market,
          primaryTimeframe:
            structuredStrategy.marketDataConfig.primaryTimeframe,
          candleGroups,
        },
      };
    } catch (error) {
      // 외부 API나 timeframe 변환 실패 시 running 상태가 남지 않도록 failed로 변경
      await this.progress.markFailed({
        strategyRunId,
        stepName: 'market_data',
        error,
      });

      throw error;
    }
  }

  async collectPortfolio(
    strategyRunId: number,
    strategy: StrategyEntity,
  ): Promise<StrategyRunStepResult> {
    await this.progress.markRunning({
      strategyRunId,
      stepName: 'portfolio',
      summary: '포트폴리오를 수집 중입니다.',
    });

    try {
      // 가상 투자일 시에는 paper portfolio를 전달
      if (strategy.strategyMode === StrategyMode.PAPER) {
        const portfolio = await this.paperPortfolioService.getPortfolio({
          userId: strategy.userId,
          market: strategy.market,
        });

        const summary = 'paper trading 가상 포트폴리오를 조회했습니다.';

        await this.progress.markCompleted({
          strategyRunId,
          stepName: 'portfolio',
          status: 'succeeded',
          summary,
        });

        return {
          name: 'portfolio',
          status: 'succeeded',
          summary,
          output: portfolio,
        };
      }

      // 실제 live 트레이딩 시 업비트 계좌를 조회한 후 계좌 데이터 전달
      const credential = await this.upbitAuthService.getDecryptedCredential(
        strategy.userId,
      );

      const balances = await this.upbitPrivateService.getAccounts({
        accessKey: credential.accessKey,
        secretKey: credential.secretKey,
      });

      const summary = `업비트 자산 ${balances.length}개를 조회했습니다.`;

      await this.progress.markCompleted({
        strategyRunId,
        stepName: 'portfolio',
        status: 'succeeded',
        summary,
      });

      return {
        name: 'portfolio',
        status: 'succeeded',
        summary,
        output: {
          balanceCount: balances.length,
          balances,
        },
      };
    } catch (error) {
      // 포트폴리오 조회 실패 시 snapshot을 failed로 남기고 run 실패 처리
      await this.progress.markFailed({
        strategyRunId,
        stepName: 'portfolio',
        error,
      });

      throw error;
    }
  }

  async collectNews(
    strategyRunId: number,
    structuredStrategy: StructuredStrategy,
  ): Promise<StrategyRunStepResult> {
    await this.progress.markRunning({
      strategyRunId: strategyRunId,
      stepName: 'news',
      summary: '뉴스 데이터를 수집 중입니다.',
    });

    if (!structuredStrategy.dataPermissions.allowNewsSearch) {
      await this.progress.markCompleted({
        strategyRunId: strategyRunId,
        stepName: 'news',
        status: 'skipped',
        summary: '전략 설정에서 뉴스 검색을 허용하지 않아 생략했습니다.',
      });

      return {
        name: 'news',
        status: 'skipped',
        summary: '전략 설정에서 뉴스 검색을 허용하지 않아 생략했습니다.',
        output: {
          enabled: false,
          articles: [],
        },
      };
    }

    const query = createNewsQuery(structuredStrategy);

    try {
      // 외부 뉴스 API 실패가 run 전체 실패로 번지지 않게 step 실패로 저장
      const articles = await this.newsDataService.search({
        query,
        display: 5,
      });

      await this.progress.markCompleted({
        strategyRunId: strategyRunId,
        stepName: 'news',
        status: 'succeeded',
        summary: '뉴스 데이터를 정상적으로 수집하였습니다.',
      });

      return {
        name: 'news',
        status: 'succeeded',
        summary: `${query} 관련 뉴스 ${articles.length}개를 조회했습니다.`,
        output: {
          enabled: true,
          query,
          fetchedAt: new Date(),
          articles,
        },
      };
    } catch (error) {
      await this.progress.markFailed({
        strategyRunId: strategyRunId,
        stepName: 'news',
        error,
      });

      return {
        name: 'news',
        status: 'failed',
        summary: `${query} 뉴스 수집에 실패했습니다.`,
        output: {
          enabled: true,
          query,
          reason: error instanceof Error ? error.message : 'unknown error',
        },
      };
    }
  }

  async collectAssetSummary(
    strategyRunId: number,
    strategy: StrategyEntity,
  ): Promise<StrategyRunStepResult> {
    await this.progress.markRunning({
      strategyRunId: strategyRunId,
      stepName: 'asset_summary',
      summary: '마켓 요약 데이터를 수집 중입니다.',
    });

    try {
      const assetSummaryData =
        await this.assetSummaryService.getSummaryByMarket(strategy.market);

      const label =
        assetSummaryData.asset.koreanName ?? assetSummaryData.symbol;

      await this.progress.markCompleted({
        strategyRunId: strategyRunId,
        stepName: 'asset_summary',
        status: 'succeeded',
        summary: '마켓 요약 데이터를 정상적으로 수집하였습니다.',
      });

      return {
        name: 'asset_summary',
        status: 'succeeded',
        summary: `${label} 자산 요약 데이터를 수집했습니다.`,
        output: assetSummaryData,
      };
    } catch (error) {
      await this.progress.markFailed({
        strategyRunId: strategyRunId,
        stepName: 'asset_summary',
        error,
      });

      return {
        name: 'asset_summary',
        status: 'failed',
        summary: `자산 요약 데이터 수집에 실패했습니다.`,
        output: {
          market: strategy.market,
          reason: error instanceof Error ? error.message : 'unknown error',
        },
      };
    }
  }

  // AI 판단 호출
  async decideAi(input: {
    structuredStrategy: StructuredStrategy;
    steps: StrategyRunStepResult[];
    previousRiskCheck?: RiskCheckResult | null;
    aiDecisionAttempt: number;
  }): Promise<AiDecisionResult> {
    return this.aiDecisionService.decide(input);
  }

  // risk check 호출
  checkRisk(input: {
    aiDecision: AiDecisionResult;
    structuredStrategy: StructuredStrategy;
    strategyMode: StrategyMode;
    collectedSteps: StrategyRunStepResult[];
  }): RiskCheckResult {
    return this.riskCheckService.check(input);
  }

  async decideOrder(input: {
    strategy: StrategyEntity;
    strategyRunId: number;
    aiDecision: AiDecisionResult;
    riskCheck: RiskCheckResult;
  }): Promise<StrategyRunStepResult> {
    const { strategy, riskCheck } = input;

    if (!riskCheck.passed) {
      const isHoldDecision = input.aiDecision.decision === 'hold';

      return {
        name: 'order',
        status: 'skipped',
        summary: isHoldDecision
          ? 'AI 판단이 hold이므로 주문을 생성하지 않습니다.'
          : 'Risk check를 통과하지 못해 주문 생성을 생략했습니다.',
        output: {
          reason: riskCheck.reason,
          violations: riskCheck.violations,
        },
      };
    }

    if (strategy.strategyJudgmentMode === StrategyJudgmentMode.USER) {
      const approval = await this.approvalService.createPending({
        strategy,
        strategyRunId: input.strategyRunId,
        aiDecision: input.aiDecision,
        riskCheck,
      });

      return {
        name: 'order',
        status: 'skipped',
        summary:
          '사용자 확인 모드이므로 주문 후보를 승인 대기 상태로 저장했습니다.',
        output: {
          approvalRequired: true,
          approvalId: approval.id,
          adjustedOrder: riskCheck.adjustedOrder,
        },
      };
    }

    if (strategy.strategyMode === StrategyMode.PAPER) {
      const orderResult = await this.paperOrderService.execute({
        userId: strategy.userId,
        market: strategy.market,
        riskCheck,
      });

      const status =
        orderResult.status === 'failed'
          ? 'failed'
          : orderResult.status === 'skipped'
            ? 'skipped'
            : 'succeeded';

      return {
        name: 'order',
        status,
        summary: orderResult.reason,
        output: orderResult,
      };
    }

    const orderResult = await this.liveOrderService.execute({
      userId: strategy.userId,
      market: strategy.market,
      riskCheck,
    });

    const status =
      orderResult.status === 'failed'
        ? 'failed'
        : orderResult.status === 'skipped'
          ? 'skipped'
          : 'succeeded';

    return {
      name: 'order',
      status,
      summary: orderResult.reason,
      output: orderResult,
    };
  }
}
