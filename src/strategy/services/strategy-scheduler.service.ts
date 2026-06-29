import { Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyRunService } from './strategy-run.service';

import { StrategyEntity } from '../entities/strategy.entity';
import { Cron } from '@nestjs/schedule';
import { StrategyStatus } from '../enums/strategy-status.enum';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';

@Injectable()
export class StrategySchedulerService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    private readonly strategyRunService: StrategyRunService,
  ) {}

  @Cron('*/1 * * * *')
  async handleStrategyRuns() {
    const now = new Date();

    // running run이 없는 전략만 실행 대상으로 조회
    const strategies = await this.strategyRepository
      .createQueryBuilder('strategy')
      .where('strategy.strategyStatus = :strategyStatus', {
        strategyStatus: StrategyStatus.ACTIVE,
      })
      .andWhere('strategy.enabled = :enabled', { enabled: true })
      .andWhere('strategy.nextRunAt <= :now', { now })
      .andWhere(
        `NOT EXISTS (
        SELECT 1
        FROM strategy_runs run
        WHERE run.strategy_id = strategy.id
          AND run.status = :runningStatus
      )`,
        { runningStatus: StrategyRunStatus.RUNNING },
      )
      .getMany();

    for (const strategy of strategies) {
      try {
        await this.strategyRunService.runByStrategy({
          userId: strategy.userId,
          strategyId: strategy.id,
        });
      } catch (error) {
        Logger.log(error);
      }
    }
  }
}
