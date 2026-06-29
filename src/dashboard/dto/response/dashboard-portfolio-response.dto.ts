import { ApiProperty } from '@nestjs/swagger';

import { PaperPortfolio } from '@/paper-trading/types/paper-portfolio.type';
import { DashboardPortfolioMode } from '../../enums/dashboard-portfolio-mode.enum';

export class DashboardPortfolioPositionDto {
  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ example: 0.01 })
  quantity!: number;

  @ApiProperty({ example: 95000000 })
  averageEntryPrice!: number | null;

  @ApiProperty({ example: 97000000 })
  currentPrice!: number;

  @ApiProperty({ example: 950000 })
  investedAmountKrw!: number;

  @ApiProperty({ example: 970000 })
  marketValueKrw!: number;

  @ApiProperty({ example: 20000 })
  unrealizedPnlKrw!: number;

  @ApiProperty({ example: 0.021 })
  unrealizedPnlRate!: number;

  @ApiProperty({ example: 0.097 })
  allocationRatio!: number;
}

export class DashboardPortfolioResponseDto {
  @ApiProperty({ enum: ['paper', 'live'], example: 'paper' })
  mode!: DashboardPortfolioMode;

  @ApiProperty({ example: 9000000 })
  cashBalance!: number;

  @ApiProperty({ example: 10000000 })
  totalAssetValue!: number;

  @ApiProperty({ example: 1000000 })
  totalMarketValueKrw!: number;

  @ApiProperty({ example: 20000 })
  totalUnrealizedPnlKrw!: number;

  @ApiProperty({ example: 0.02 })
  totalUnrealizedPnlRate!: number;

  @ApiProperty({ type: [DashboardPortfolioPositionDto] })
  positions!: DashboardPortfolioPositionDto[];

  static fromPaperPortfolio(
    portfolio: PaperPortfolio,
  ): DashboardPortfolioResponseDto {
    return {
      mode: DashboardPortfolioMode.PAPER,
      cashBalance: portfolio.cashBalance,
      totalAssetValue: portfolio.totalAssetValue,
      totalMarketValueKrw: portfolio.totalMarketValueKrw,
      totalUnrealizedPnlKrw: portfolio.totalUnrealizedPnlKrw,
      totalUnrealizedPnlRate: portfolio.totalUnrealizedPnlRate,
      positions: portfolio.positions,
    };
  }
}
