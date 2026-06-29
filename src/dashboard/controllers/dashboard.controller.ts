import { ApiTags } from '@nestjs/swagger';
import {
  Get,
  Query,
  Param,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';

import { CurrentUser } from '@/auth/decorators/current-user.decorator';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

import { DashboardChartService } from '../services/dashboard-chart.service';
import { DashboardTradeLogService } from '../services/dashboard-trade-log.service';
import { DashboardPortfolioService } from '../services/dashboard-portfolio.service';
import { DashboardLatestRunService } from '../services/dashboard-latest-run.service';
import { DashboardMarketSummaryService } from '../services/dashboard-market-summary.service';

import {
  ApiGetDashboardChart,
  ApiGetDashboardLatestRun,
  ApiGetDashboardTradeLogs,
  ApiGetDashboardPortfolio,
  ApiGetDashboardMarketSummaries,
} from '../docs/dashboard-api.docs';

import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { DashboardChartQueryDto } from '../dto/query/dashboard-chart-query.dto';
import { DashboardChartResponseDto } from '../dto/response/dashboard-chart-response.dto';
import { DashboardPortfolioQueryDto } from '../dto/query/dashboard-portfolio-query.dto';
import { DashboardTradeLogsQueryDto } from '../dto/query/dashboard-trade-log-query.dto';
import { DashboardPortfolioResponseDto } from '../dto/response/dashboard-portfolio-response.dto';
import { DashboardLatestRunResponseDto } from '../dto/response/dashboard-latest-run-response.dto';
import { DashboardTradeLogsResponseDto } from '../dto/response/dashboard-trade-log-response.dto';
import { DashboardMarketSummariesQueryDto } from '../dto/query/dashboard-market-summaries-query.dto';
import { DashboardMarketSummariesResponseDto } from '../dto/response/dashboard-market-summaries-response.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardChartService: DashboardChartService,
    private readonly dashboardTradeLogService: DashboardTradeLogService,
    private readonly dashboardPortfolioService: DashboardPortfolioService,
    private readonly dashboardLatestRunService: DashboardLatestRunService,
    private readonly dashboardMarketSummaryService: DashboardMarketSummaryService,
  ) {}

  @Get('portfolio')
  @UseGuards(JwtAuthGuard)
  @ApiGetDashboardPortfolio()
  async getPortfolio(
    @Query() query: DashboardPortfolioQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardPortfolioResponseDto> {
    return this.dashboardPortfolioService.getPortfolio({
      userId: user.id,
      query,
    });
  }

  @Get('strategies/:strategyId/latest-run')
  @UseGuards(JwtAuthGuard)
  @ApiGetDashboardLatestRun()
  async getLatestRun(
    @Param('strategyId', ParseIntPipe) strategyId: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardLatestRunResponseDto> {
    return this.dashboardLatestRunService.getLatestRun({
      userId: user.id,
      strategyId,
    });
  }

  @Get('chart')
  @UseGuards(JwtAuthGuard)
  @ApiGetDashboardChart()
  async getChart(
    @Query() query: DashboardChartQueryDto,
  ): Promise<DashboardChartResponseDto> {
    return this.dashboardChartService.getChart(query);
  }

  @Get('market-summaries')
  @UseGuards(JwtAuthGuard)
  @ApiGetDashboardMarketSummaries()
  async getMarketSummaries(
    @Query() query: DashboardMarketSummariesQueryDto,
  ): Promise<DashboardMarketSummariesResponseDto> {
    return this.dashboardMarketSummaryService.getMarketSummaries(query);
  }

  @Get('trade-logs')
  @UseGuards(JwtAuthGuard)
  @ApiGetDashboardTradeLogs()
  async getTradeLogs(
    @Query() query: DashboardTradeLogsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardTradeLogsResponseDto> {
    return this.dashboardTradeLogService.getTradeLogs({
      userId: user.id,
      query,
    });
  }
}
