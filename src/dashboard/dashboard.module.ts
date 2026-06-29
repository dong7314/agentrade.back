import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StrategyRunEntity } from '@/strategy/entities/strategy-run.entity';
import { StrategyOrderApprovalEntity } from '@/strategy/entities/strategy-order-approval.entity';

import { UpbitModule } from '@/upbit/upbit.module';
import { PaperTradingModule } from '@/paper-trading/paper-trading.module';

import { DashboardController } from './controllers/dashboard.controller';

import { DashboardChartService } from './services/dashboard-chart.service';
import { DashboardTradeLogService } from './services/dashboard-trade-log.service';
import { DashboardPortfolioService } from './services/dashboard-portfolio.service';
import { DashboardLatestRunService } from './services/dashboard-latest-run.service';
import { DashboardMarketSummaryService } from './services/dashboard-market-summary.service';

@Module({
  imports: [
    UpbitModule,
    PaperTradingModule,
    TypeOrmModule.forFeature([StrategyRunEntity, StrategyOrderApprovalEntity]),
  ],
  controllers: [DashboardController],
  providers: [
    DashboardChartService,
    DashboardTradeLogService,
    DashboardPortfolioService,
    DashboardLatestRunService,
    DashboardMarketSummaryService,
  ],
})
export class DashboardModule {}
