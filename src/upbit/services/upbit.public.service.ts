import { BadGatewayException, Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  UpbitTicker,
  UpbitTickerResponse,
} from '../types/public/upbit-ticker.type';
import { UpbitCandle } from '../types/public/upbit-candle.type';
import { UpbitMinuteUnit } from '../types/public/upbit-minute-unit.type';
import { UpbitMinuteCandleResponse } from '../types/public/upbit-minute-candle.response';

@Injectable()
export class UpbitPublicService {
  constructor(private readonly configService: ConfigService) {}

  // upbit 차트 데이터 불러오는 메서드
  async getMinuteCandles(input: {
    market: string;
    unit: UpbitMinuteUnit;
    count: number;
  }): Promise<UpbitCandle[]> {
    const baseurl = this.configService.getOrThrow<string>('UPBIT_BASE_URL');
    const timeoutMs = this.configService.getOrThrow<number>('UPBIT_TIMEOUT_MS');

    const url = new URL(`/v1/candles/minutes/${input.unit}`, baseurl);

    url.searchParams.set('market', input.market);
    url.searchParams.set('count', String(input.count));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException('업비트 캔들 api 호출에 실패하였습니다.');
      }

      const data = (await response.json()) as UpbitMinuteCandleResponse[];

      return data.map((item) => ({
        market: item.market,
        timeframe: `${input.unit}m`,
        openedAt: new Date(item.candle_date_time_utc),
        open: item.opening_price,
        high: item.high_price,
        low: item.low_price,
        close: item.trade_price,
        volume: item.candle_acc_trade_volume,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }

  async getTickers(markets: string[]): Promise<UpbitTicker[]> {
    if (markets.length === 0) {
      return [];
    }

    const baseUrl = this.configService.getOrThrow<string>('UPBIT_BASE_URL');
    const timeoutMs = this.configService.getOrThrow<number>('UPBIT_TIMEOUT_MS');

    const url = new URL('/v1/ticker', baseUrl);
    url.searchParams.set('markets', markets.join(','));

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new BadGatewayException('업비트 현재가 api 호출에 실패하였습니다.');
    }

    const data = (await response.json()) as UpbitTickerResponse[];

    return data.map((item) => ({
      market: item.market,
      tradePrice: item.trade_price,
      signedChangeRate: item.signed_change_rate,
      highPrice: item.high_price,
      lowPrice: item.low_price,
      accTradeVolume24h: item.acc_trade_volume_24h,
      accTradePrice24h: item.acc_trade_price_24h,
    }));
  }
}
