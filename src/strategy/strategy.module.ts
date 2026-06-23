import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LlmModule } from '@/llm/llm.module';
import { UserModule } from '@/user/user.module';
import { NewsModule } from '@/news/news.module';
import { UpbitModule } from '@/upbit/upbit.module';
import { PaperTradingModule } from '@/paper-trading/paper-trading.module';

import { StrategyService } from './services/strategy.service';
import { StrategyRunService } from './services/strategy-run.service';
import { StrategyParseService } from './services/strategy-parse.service';
import { StrategySchedulerService } from './services/strategy-scheduler.service';
import { StrategyExecutionService } from './services/strategy-execution.service';

import { StrategyController } from './controllers/strategy.controller';
import { StrategyRunController } from './controllers/strategy-run.controller';

import { StrategyEntity } from './entities/strategy.entity';
import { StrategyRunEntity } from './entities/strategy-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyEntity, StrategyRunEntity]),
    UserModule,
    LlmModule,
    NewsModule,
    UpbitModule,
    PaperTradingModule,
  ],
  controllers: [StrategyController, StrategyRunController],
  providers: [
    StrategyService,
    StrategyRunService,
    StrategyParseService,
    StrategySchedulerService,
    StrategyExecutionService,
  ],
})
export class StrategyModule {}
