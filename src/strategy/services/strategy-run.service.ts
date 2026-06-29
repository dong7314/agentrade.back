import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyEntity } from '../entities/strategy.entity';
import { StrategyRunEntity } from '../entities/strategy-run.entity';

import { StrategyExecutionService } from './strategy-execution.service';

import { calculateNextRunAt } from '../utils/calculate-next-run-at';
import { isStrategyRunResult } from '../validators/strategy-run-result.validator';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';
import { createPaginationMeta } from '@/common/utils/create-pagination-meta';
import { isUniqueViolation } from '@/database/utils/is-unique-violation';

import { StrategyStatus } from '../enums/strategy-status.enum';
import { PaginatedResult } from '@/common/types/paginated.type';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { FindStrategyRunsQueryDto } from '../dto/find-strategy-run.query.dto';

@Injectable()
export class StrategyRunService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    @InjectRepository(StrategyRunEntity)
    private readonly strategyRunRepository: Repository<StrategyRunEntity>,
    private readonly dataSource: DataSource,
    private readonly strategyExecutionService: StrategyExecutionService,
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
  async runByStrategy(input: {
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

    await this.assertNoRunningRun(strategy.id);

    const now = new Date();

    let strategyRun: StrategyRunEntity;

    try {
      // 동시에 실행 요청이 들어와도 DB unique index가 마지막 방어선을 담당
      strategyRun = await this.strategyRunRepository.save(
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
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('이미 실행 중인 전략입니다.');
      }

      throw error;
    }

    try {
      const result = await this.strategyExecutionService.execute({
        strategy,
        strategyRunId: strategyRun.id,
      });

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

      strategy.nextRunAt = calculateNextRunAt(
        strategy.scheduleAnchorAt,
        strategy.intervalMinutes,
      );

      return this.dataSource.transaction(async (manager) => {
        await manager.save(StrategyEntity, strategy);
        return manager.save(StrategyRunEntity, strategyRun);
      });
    }
  }

  // 전략이 지금 현재 실행중인지 체크하는 메서드
  private async assertNoRunningRun(strategyId: number): Promise<void> {
    const runningRun = await this.strategyRunRepository.findOne({
      where: {
        strategyId,
        status: StrategyRunStatus.RUNNING,
      },
    });

    if (runningRun) {
      throw new BadRequestException('이미 실행 중인 전략입니다.');
    }
  }
}
