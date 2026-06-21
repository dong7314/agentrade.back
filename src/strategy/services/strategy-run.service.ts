import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyEntity } from '../entities/strategy.entity';
import { StrategyRunEntity } from '../entities/strategy-run.entity';

import { calculateNextRunAt } from '../utils/calculate-next-run-at';
import { isStrategyRunResult } from '../validators/strategy-run-result.validator';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';
import { createPaginationMeta } from '@/common/utils/create-pagination-meta';

import { StrategyStatus } from '../enums/strategy-status.enum';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { StrategyRunResult } from '../types/strategy-run-result.type';
import { FindStrategyRunsQueryDto } from '../dto/find-strategy-run.query.dto';
import { PaginatedResult } from '@/common/types/paginated.type';

@Injectable()
export class StrategyRunService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    @InjectRepository(StrategyRunEntity)
    private readonly strategyRunRepository: Repository<StrategyRunEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // 페이지를 통해서 전략 이력들 아이템을 가져오는 메서드
  async findAllByUserId(
    userId: number,
    query: FindStrategyRunsQueryDto,
  ): Promise<PaginatedResult<StrategyRunEntity>> {
    const { page, limit } = query;

    const [items, total] = await this.strategyRunRepository.findAndCount({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.strategyId ? { strategyId: query.strategyId } : {}),
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: createPaginationMeta({ page, limit, total }),
    };
  }

  // 전략 이력 하나를 찾는 메서드
  async findOneByStrategyRunId(
    strategyRunId: number,
    userId: number,
  ): Promise<StrategyRunEntity> {
    const strategyRun = await this.strategyRunRepository.findOne({
      where: {
        id: strategyRunId,
        userId,
      },
    });

    if (!strategyRun) {
      throw new NotFoundException('전략 이력이 존재하지 않습니다.');
    }

    return strategyRun;
  }

  // 목 데이터로 전략 이력 생성
  async runMockByStrategy(input: {
    userId: number;
    strategyId: number;
  }): Promise<StrategyRunEntity> {
    const strategy = await this.strategyRepository.findOne({
      where: {
        id: input.strategyId,
        userId: input.userId,
      },
    });

    if (!strategy) {
      throw new NotFoundException('전략이 존재하지 않습니다.');
    }

    if (strategy.strategyStatus !== StrategyStatus.ACTIVE) {
      throw new BadRequestException('활성화된 전략만 실행할 수 있습니다.');
    }

    if (!strategy.enabled) {
      throw new BadRequestException('자동 실행이 비활성화된 전략입니다.');
    }

    if (!isStructuredStrategy(strategy.structuredStrategy)) {
      throw new BadRequestException(
        '구조화되지 않은 전략은 실행할 수 없습니다.',
      );
    }

    const now = new Date();

    const strategyRun = await this.strategyRunRepository.save(
      this.strategyRunRepository.create({
        strategyId: strategy.id,
        userId: strategy.userId,
        status: StrategyRunStatus.RUNNING,
        startedAt: now,
        result: null,
        errorMessage: null,
        finishedAt: null,
      }),
    );

    try {
      const result = this.executeMockWorkflow(strategy);

      if (!isStrategyRunResult(result)) {
        throw new BadRequestException(
          '전략 실행 결과 형식이 유효하지 않습니다.',
        );
      }

      strategyRun.status = StrategyRunStatus.SUCCEEDED;
      strategyRun.finishedAt = new Date();
      strategyRun.result = result;

      strategy.nextRunAt = calculateNextRunAt(
        strategy.scheduleAnchorAt,
        strategy.intervalMinutes,
      );

      return this.dataSource.transaction(async (manager) => {
        await manager.save(StrategyEntity, strategy);
        return manager.save(StrategyRunEntity, strategyRun);
      });
    } catch (error) {
      strategyRun.status = StrategyRunStatus.FAILED;
      strategyRun.finishedAt = new Date();
      strategyRun.errorMessage =
        error instanceof Error
          ? error.message
          : '알 수 없는 에러가 발생하였습니다.';

      return this.strategyRunRepository.save(strategyRun);
    }
  }

  // mock workflow 반환
  private executeMockWorkflow(strategy: StrategyEntity): StrategyRunResult {
    return {
      decision: 'hold',
      reason: 'mock execution only',
      confidence: 0.5,
      steps: [
        {
          name: 'market_data',
          status: 'skipped',
          summary: 'mock 실행에서는 시장 데이터 조회를 생략했습니다.',
        },
        {
          name: 'news',
          status: 'skipped',
          summary: 'mock 실행에서는 뉴스 조회를 생략했습니다.',
        },
        {
          name: 'ai_decision',
          status: 'succeeded',
          summary: 'mock 판단으로 hold를 반환했습니다.',
        },
        {
          name: 'risk_check',
          status: 'skipped',
          summary: 'mock 실행에서는 리스크 검사를 생략했습니다.',
        },
        {
          name: 'order',
          status: 'skipped',
          summary: 'mock 실행에서는 주문을 생성하지 않았습니다.',
        },
      ],
      strategy: {
        id: strategy.id,
        market: strategy.market,
        intervalMinutes: strategy.intervalMinutes,
      },
    };
  }
}
