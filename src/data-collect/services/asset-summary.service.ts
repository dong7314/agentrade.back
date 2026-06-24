import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { isRecord } from '@/common/utils/is-record';

import { AssetSummary, AssetSummarySignal } from '../types/asset-summary.type';

@Injectable()
export class AssetSummaryService {
  async getSummaryByMarket(market: string): Promise<AssetSummary> {
    const symbol = this.toSymbol(market);
    const url = `https://datalab.upbit.com/assets/${symbol}/summary`;

    // Upbit DataLab 자산 요약 페이지 HTML을 가져옴
    // 이 페이지 안에는 화면 렌더링용 데이터가 React Query dehydrated JSON으로 포함
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'agentrade-backend/1.0',
      },
    });

    if (!response.ok) {
      throw new ServiceUnavailableException('자산 요약 조회에 실패했습니다.');
    }

    const html = await response.text();
    const rawText = this.extractBodyText(html);

    // HTML 안에 들어있는 React Query cache에서 필요한 query 데이터 추출
    // 화면 텍스트를 정규식으로 직접 긁는 것보다 구조가 안정적
    const assetInfo = this.recordOrNull(
      this.extractQueryData(html, ['asset', 'info']),
    );
    const recentPrices = this.extractQueryData(html, [
      'exchange',
      'candles',
      'recents',
    ]);
    const marketCapData = this.extractQueryData(html, [
      'indicator',
      'mcap',
      'assets',
    ]);
    const tradingVolumeData = this.extractQueryData(html, [
      'indicator',
      'katp',
      'assets',
    ]);
    const premiumData = this.extractQueryData(html, [
      'indicator',
      'premium',
      'assets',
    ]);
    const fearGreedData = this.extractQueryData(html, [
      'indicator',
      'fear-greed',
      'assets',
    ]);
    const technicalData = this.extractQueryData(html, [
      'indicator',
      'tech',
      'overall',
      'assets',
    ]);

    const recent = this.firstRecord(recentPrices);
    const marketCap = this.firstElementRecord(marketCapData);
    const tradingVolume = this.firstElementRecord(tradingVolumeData);
    const premium = this.firstElementRecord(premiumData);
    const fearGreed = this.firstElementRecord(fearGreedData);
    const technical = this.firstElementRecord(technicalData);
    const technicalComponents = this.recordValue(technical, 'components');
    const volatility = this.parseVolatility(rawText);

    // AI decision 단계에 넘기기 좋은 형태로 원본 DataLab 데이터를 재구성
    // 수익률/시총/거래대금처럼 ratio로 내려오는 값은 percent 단위로 변환
    return {
      source: 'upbit_datalab_asset_summary',
      market,
      symbol,
      url,
      fetchedAt: new Date(),
      rawText,
      asset: {
        koreanName: this.stringValue(assetInfo, 'koreanName'),
        englishName: this.stringValue(assetInfo, 'englishName'),
        marketCapRank: this.numberValue(assetInfo, 'mcapRank'),
      },
      price: {
        tradePrice: this.numberValue(recent, 'tradePrice'),
        return24hPercent: this.toPercent(
          this.numberValue(recent, 'changeRatioTradePrice24h') ??
            this.numberValue(recent, 'changeRatioTradePrice'),
        ),
        highPrice24h: this.numberValue(recent, 'highPrice24h'),
        lowPrice24h: this.numberValue(recent, 'lowPrice24h'),
      },
      marketCap: {
        value:
          this.numberValue(marketCap, 'marketCap') ??
          this.numberValue(assetInfo, 'mcap'),
        change24hPercent: this.toPercent(
          this.numberValue(marketCap, 'changeRatioMarketCap24h'),
        ),
      },
      tradingVolume: {
        value24h:
          this.numberValue(tradingVolume, 'accTradePrice24h') ??
          this.numberValue(recent, 'candleAccTradePrice24h'),
        change24hPercent: this.toPercent(
          this.numberValue(tradingVolume, 'changeRatioAccTradePrice24h'),
        ),
      },
      upbitPremium: {
        valuePercent: this.numberValue(premium, 'disparityRate'),
        delta: this.numberValue(premium, 'deltaDisparityRate'),
      },
      fearGreed: {
        score: this.numberValue(fearGreed, 'score'),
        label: this.toFearGreedLabel(this.numberValue(fearGreed, 'score')),
        prevScore24h: this.numberValue(fearGreed, 'prevScore24h'),
        change24hPercent: this.toPercent(
          this.numberValue(fearGreed, 'changeRatioScore24h'),
        ),
      },
      technicalAnalysis: {
        score: this.numberValue(technical, 'score'),
        signal: this.signalValue(technical, 'scoreStatus'),
        rsi: {
          value: this.numberValue(technicalComponents, 'rsi'),
          signal: this.signalValue(technicalComponents, 'rsiStatus'),
        },
        bollingerBand: {
          percentB: this.numberValue(technicalComponents, 'percentB'),
          signal: this.signalValue(technicalComponents, 'percentBStatus'),
        },
        stochastic: {
          percentK: this.numberValue(technicalComponents, 'percentK'),
          signal: this.signalValue(technicalComponents, 'percentKStatus'),
        },
      },
      volatility: {
        volatilityText: volatility.volatilityText,
        betaText: volatility.betaText,
        riskAdjustedReturnText: volatility.riskAdjustedReturnText,
      },
    };
  }

  private extractQueryData(html: string, queryKeyParts: string[]): unknown {
    // Next.js HTML 안의 escaped JSON 조각 중 원하는 queryKey를 가진 state.data.data만 추출
    const queryRegex =
      /\{\\"dehydratedAt\\":\d+,\\"state\\":([\s\S]*?),\\"queryKey\\":\[\[(.*?)\],\{(.*?)\}\],\\"queryHash\\":\\"(.*?)\\"\}/g;

    for (const match of html.matchAll(queryRegex)) {
      const stateText = match[1];
      const queryKeyText = this.decodeEscapedJson(match[2] ?? '');
      const matched = queryKeyParts.every((part) =>
        queryKeyText.includes(`"${part}"`),
      );

      if (!matched || !stateText) {
        continue;
      }

      const state = this.parseJsonObject<{
        data?: {
          data?: unknown;
        };
      }>(this.decodeEscapedJson(stateText));

      if (!state) {
        continue;
      }

      return state.data?.data ?? null;
    }

    return null;
  }

  private parseJsonObject<T extends object>(value: string): T | null {
    // 외부 HTML에서 꺼낸 문자열이므로 JSON parse 결과를 unknown으로 받고 object인지 확인
    try {
      const parsed: unknown = JSON.parse(value);

      if (!isRecord(parsed)) {
        return null;
      }

      return parsed as T;
    } catch {
      return null;
    }
  }

  private decodeEscapedJson(value: string): string {
    // HTML script 안에 이스케이프되어 들어간 JSON 문자열을 일반 JSON 문자열 변환
    return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  private firstRecord(value: unknown): Record<string, unknown> | null {
    // recent candle query처럼 data가 배열로 내려오는 경우 첫 번째 row를 추출
    if (!Array.isArray(value)) {
      return null;
    }

    const first: unknown = value[0];

    if (!isRecord(first)) {
      return null;
    }

    return first;
  }

  private firstElementRecord(value: unknown): Record<string, unknown> | null {
    // 대부분의 indicator query는 { elements: [...] } 형태라 첫 번째 element를 사용
    if (!isRecord(value)) {
      return null;
    }

    const elements: unknown = value.elements;

    if (!Array.isArray(elements)) {
      return null;
    }

    const first: unknown = elements[0];

    if (!isRecord(first)) {
      return null;
    }

    return first;
  }

  private recordValue(
    value: Record<string, unknown> | null,
    key: string,
  ): Record<string, unknown> | null {
    // technical.components처럼 중첩된 object 값을 안전하게 추출
    const child = value?.[key];

    if (!isRecord(child)) {
      return null;
    }

    return child;
  }

  private recordOrNull(value: unknown): Record<string, unknown> | null {
    if (!isRecord(value)) {
      return null;
    }

    return value;
  }

  private stringValue(
    value: Record<string, unknown> | null,
    key: string,
  ): string | null {
    const rawValue = value?.[key];

    if (typeof rawValue !== 'string') {
      return null;
    }

    return rawValue;
  }

  private numberValue(
    value: Record<string, unknown> | null,
    key: string,
  ): number | null {
    const rawValue = value?.[key];

    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
      return null;
    }

    return rawValue;
  }

  private signalValue(
    value: Record<string, unknown> | null,
    key: string,
  ): AssetSummarySignal | null {
    const rawValue = value?.[key];

    if (rawValue !== 'BUY' && rawValue !== 'SELL' && rawValue !== 'NEUTRAL') {
      return null;
    }

    return rawValue;
  }

  private toPercent(value: number | null): number | null {
    // DataLab ratio 값은 0.1234 형태로 내려오므로 AI가 읽기 쉬운 percent 값으로 변환
    if (value === null) {
      return null;
    }

    return Number((value * 100).toFixed(2));
  }

  private toFearGreedLabel(score: number | null): string | null {
    // DataLab 공포/탐욕 score를 사람이 읽기 쉬운 한국어 단계로 변환
    if (score === null) {
      return null;
    }

    if (score < 20) return '매우 공포';
    if (score < 40) return '공포';
    if (score < 60) return '중립';
    if (score < 80) return '탐욕';

    return '매우 탐욕';
  }

  private parseVolatility(text: string): AssetSummary['volatility'] {
    // 변동성 섹션은 현재 JSON query가 아니라 화면 텍스트 fallback으로 읽습니다.
    // 상단 탭 문구와 구분하기 위해 "변동성 변동성 ... 베타(BTC) ..." 묶음을 한 번에 찾습니다.
    const match = text.match(
      /변동성\s+변동성\s+([^\s]+)\s+베타\(BTC\)\s+([^\s]+)\s+변동성 대비 수익률\s+([^\s]+)/,
    );

    return {
      volatilityText: match?.[1] ?? null,
      betaText: match?.[2] ?? null,
      riskAdjustedReturnText: match?.[3] ?? null,
    };
  }

  private extractBodyText(html: string): string {
    // fallback 파싱과 디버깅을 위해 HTML에서 script/style/tag를 제거한 본문 텍스트 생성
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;

    return body
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toSymbol(market: string): string {
    // KRW-XRP 같은 market 문자열에서 DataLab URL에 필요한 XRP symbol만 추출
    const [, symbol] = market.split('-');

    if (!symbol) {
      throw new BadGatewayException('market 형식이 올바르지 않습니다.');
    }

    return symbol.toUpperCase();
  }
}
