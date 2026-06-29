import { ApiProperty } from '@nestjs/swagger';

import type { UpbitCandle } from '@/upbit/types/public/upbit-candle.type';

export class DashboardChartCandleDto {
  @ApiProperty()
  openedAt!: Date;

  @ApiProperty({ example: 95000000 })
  open!: number;

  @ApiProperty({ example: 97000000 })
  high!: number;

  @ApiProperty({ example: 94000000 })
  low!: number;

  @ApiProperty({ example: 96500000 })
  close!: number;

  @ApiProperty({ example: 123.45 })
  volume!: number;
}

export class DashboardChartResponseDto {
  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ example: '5m' })
  timeframe!: string;

  @ApiProperty({ example: 50 })
  candleCount!: number;

  @ApiProperty({ type: [DashboardChartCandleDto] })
  candles!: DashboardChartCandleDto[];

  static fromCandles(input: {
    market: string;
    timeframe: string;
    candles: UpbitCandle[];
  }): DashboardChartResponseDto {
    return {
      market: input.market,
      timeframe: input.timeframe,
      candleCount: input.candles.length,
      candles: input.candles.map((candle) => ({
        openedAt: candle.openedAt,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      })),
    };
  }
}
