import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';

import { StrategyRunEntity } from '@/strategy/entities/strategy-run.entity';
import { StrategyOrderApprovalEntity } from '@/strategy/entities/strategy-order-approval.entity';

import { DashboardLatestRunResponseDto } from '../dto/response/dashboard-latest-run-response.dto';

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
      steps:
        result?.steps.map((step) => ({
          name: step.name,
          status: step.status,
          summary: step.summary,
          output: step.output,
        })) ?? [],
      approvalId: approval?.id ?? null,
      approvalStatus: approval?.status ?? null,
      startedAt: latestRun.startedAt,
      finishedAt: latestRun.finishedAt,
    };
  }
}
