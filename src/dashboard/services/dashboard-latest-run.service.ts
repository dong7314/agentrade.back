import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';

import { StrategyRunEntity } from '@/strategy/entities/strategy-run.entity';
import { StrategyOrderApprovalEntity } from '@/strategy/entities/strategy-order-approval.entity';

import {
  DashboardLatestRunResponseDto,
  DashboardLatestRunStepDto,
} from '../dto/response/dashboard-latest-run-response.dto';
import { StrategyOrderApprovalStatus } from '@/strategy/enums/strategy-order-approval-status.enum';

@Injectable()
export class DashboardLatestRunService {
  constructor(
    @InjectRepository(StrategyRunEntity)
    private readonly strategyRunRepository: Repository<StrategyRunEntity>,
    @InjectRepository(StrategyOrderApprovalEntity)
    private readonly approvalRepository: Repository<StrategyOrderApprovalEntity>,
  ) {}

  async getLatestRun(input: {
    userId: number;
    strategyId: number;
  }): Promise<DashboardLatestRunResponseDto> {
    // 현재 사용자의 해당 전략 최신 run 하나를 조회
    const latestRun = await this.strategyRunRepository.findOne({
      where: {
        userId: input.userId,
        strategyId: input.strategyId,
      },
      order: {
        startedAt: 'DESC',
        id: 'DESC',
      },
    });

    if (!latestRun) {
      throw new NotFoundException('최근 전략 실행 이력이 존재하지 않습니다.');
    }

    // run에 연결된 approval이 있으면 같이 조회
    const approval = await this.approvalRepository.findOne({
      where: {
        userId: input.userId,
        strategyRunId: latestRun.id,
      },
    });

    const result = latestRun.result;

    return {
      runId: latestRun.id,
      strategyId: latestRun.strategyId,
      status: latestRun.status,
      decision: result?.decision ?? null,
      confidence: result?.confidence ?? null,
      reason: result?.reason ?? null,

      // 실행 중이면 graphSnapshot 기준, 완료 후에는 result.steps 기준으로 반환
      steps: this.createSteps(latestRun, approval),

      approvalId: approval?.id ?? null,
      approvalStatus: approval?.status ?? null,
      currentStepName: latestRun.graphSnapshot?.currentStepName ?? null,
      startedAt: latestRun.startedAt,
      finishedAt: latestRun.finishedAt,
    };
  }

  private createSteps(
    run: StrategyRunEntity,
    approval: StrategyOrderApprovalEntity | null,
  ): DashboardLatestRunStepDto[] {
    // result가 없으면 실행 중/실패 중간 상태일 수 있으므로 snapshot을 우선 사용
    if (!run.result && run.graphSnapshot?.nodes.length) {
      return this.appendApprovalStep(
        run.graphSnapshot.nodes.map((node) => ({
          name: node.stepName,
          status: node.status,
          summary: node.summary ?? '',
        })),
        approval,
      );
    }

    const resultSteps =
      run.result?.steps.map((step) => ({
        name: step.name,
        status: step.status,
        summary: step.summary,
        output: step.output,
      })) ?? [];

    return this.appendApprovalStep(resultSteps, approval);
  }

  private appendApprovalStep(
    steps: DashboardLatestRunStepDto[],
    approval: StrategyOrderApprovalEntity | null,
  ): DashboardLatestRunStepDto[] {
    if (!approval) {
      return steps;
    }

    return [
      ...steps,
      {
        name: 'approval',
        status: approval.status,
        summary: this.createApprovalSummary(approval.status),
        output: {
          approvalId: approval.id,
        },
      },
    ];
  }

  private createApprovalSummary(status: StrategyOrderApprovalStatus): string {
    if (status === StrategyOrderApprovalStatus.PENDING) {
      return '사용자 수락 또는 거절을 기다리는 중입니다.';
    }

    if (status === StrategyOrderApprovalStatus.REJECTED) {
      return '사용자가 주문 후보를 거절했습니다.';
    }

    if (status === StrategyOrderApprovalStatus.EXECUTED) {
      return '사용자 승인 후 주문 실행이 완료되었습니다.';
    }

    return `사용자 승인 상태: ${status}`;
  }
}
