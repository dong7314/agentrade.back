import { BadRequestException } from '@nestjs/common';

export type UpbitMinuteUnit = 1 | 3 | 5 | 10 | 15 | 30 | 60 | 240;

export function toUpbitMinuteUnit(
  timeframe: string,
): 1 | 3 | 5 | 10 | 15 | 30 | 60 | 240 {
  if (timeframe === '1m') return 1;
  if (timeframe === '3m') return 3;
  if (timeframe === '5m') return 5;
  if (timeframe === '10m') return 10;
  if (timeframe === '15m') return 15;
  if (timeframe === '30m') return 30;
  if (timeframe === '1h') return 60;
  if (timeframe === '4h') return 240;

  throw new BadRequestException(
    `지원하지 않는 업비트 분봉 timeframe입니다: ${timeframe}`,
  );
}
