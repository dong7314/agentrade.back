import { ApiProperty } from '@nestjs/swagger';

import type { UpbitTicker } from '@/upbit/types/public/upbit-ticker.type';

export class DashboardMarketSummaryItemDto {
  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ example: 'BTC' })
  symbol!: string;

  @ApiProperty({ example: 95000000 })
  tradePrice!: number;

  @ApiProperty({ example: 2.15 })
  signedChangeRatePercent!: number;

  @ApiProperty({ example: 97000000 })
  highPrice!: number;

  @ApiProperty({ example: 93000000 })
  lowPrice!: number;

  @ApiProperty({ example: 1234.56 })
  accTradeVolume24h!: number;

  @ApiProperty({ example: 120000000000 })
  accTradePrice24h!: number;
}

export class DashboardMarketSummariesResponseDto {
  @ApiProperty({ type: [DashboardMarketSummaryItemDto] })
  items!: DashboardMarketSummaryItemDto[];

  static fromTickers(
    tickers: UpbitTicker[],
  ): DashboardMarketSummariesResponseDto {
    return {
      items: tickers.map((ticker) => ({
        market: ticker.market,
        symbol: ticker.market.split('-')[1] ?? ticker.market,
        tradePrice: ticker.tradePrice,
        signedChangeRatePercent: Number(
          (ticker.signedChangeRate * 100).toFixed(2),
        ),
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        accTradeVolume24h: ticker.accTradeVolume24h,
        accTradePrice24h: ticker.accTradePrice24h,
      })),
    };
  }
}
