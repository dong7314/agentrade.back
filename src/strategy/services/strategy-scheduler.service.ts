import { LessThanOrEqual, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyRunService } from './strategy-run.service';

import { StrategyEntity } from '../entities/strategy.entity';
import { Cron } from '@nestjs/schedule';
import { StrategyStatus } from '../enums/strategy-status.enum';

@Injectable()
export class StrategySchedulerService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    private readonly strategyRunService: StrategyRunService,
  ) {}

  @Cron('*/1 * * * *')
  async handleStrategyRuns() {
    // 1분마다 실행 대상 전략 조회
    const strategies = await this.strategyRepository.find({
      where: {
        strategyStatus: StrategyStatus.ACTIVE,
        enabled: true,
        nextRunAt: LessThanOrEqual(new Date()),
      },
    });

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
