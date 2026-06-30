import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LlmModule } from '@/llm/llm.module';
import { UserModule } from '@/user/user.module';
import { UpbitModule } from '@/upbit/upbit.module';
import { DataCollectModule } from '@/data-collect/data-collect.module';
import { TradeMarketModule } from '@/trade-market/trade-market.module';
import { PaperTradingModule } from '@/paper-trading/paper-trading.module';

import { StrategyService } from './services/strategy.service';
import { RiskCheckService } from './services/risk-check.service';
import { AiDecisionService } from './services/ai-decision.service';
import { StrategyRunService } from './services/strategy-run.service';
import { StrategyParseService } from './services/strategy-parse.service';
import { StrategySchedulerService } from './services/strategy-scheduler.service';
import { StrategyExecutionService } from './services/strategy-execution.service';
import { StrategyRunProgressService } from './services/strategy-run-progress.service';
import { StrategyOrderApprovalService } from './services/strategy-order-approval.service';
import { StrategyExecutionNodeService } from './services/strategy-execution-node.service';
import { StrategyExecutionGraphService } from './services/strategy-execution-graph.service';

import { StrategyController } from './controllers/strategy.controller';
import { StrategyRunController } from './controllers/strategy-run.controller';
import { StrategyOrderApprovalController } from './controllers/strategy-order-approval.controller';

import { StrategyEntity } from './entities/strategy.entity';
import { StrategyRunEntity } from './entities/strategy-run.entity';
import { StrategyOrderApprovalEntity } from './entities/strategy-order-approval.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StrategyEntity,
      StrategyRunEntity,
      StrategyOrderApprovalEntity,
    ]),
    UserModule,
    LlmModule,
    UpbitModule,
    DataCollectModule,
    TradeMarketModule,
    PaperTradingModule,
  ],
  controllers: [
    StrategyController,
    StrategyRunController,
    StrategyOrderApprovalController,
  ],
  providers: [
    StrategyService,
    RiskCheckService,
    AiDecisionService,
    StrategyRunService,
    StrategyParseService,
    StrategySchedulerService,
    StrategyExecutionService,
    StrategyRunProgressService,
    StrategyExecutionNodeService,
    StrategyOrderApprovalService,
    StrategyExecutionGraphService,
  ],
})
export class StrategyModule {}
