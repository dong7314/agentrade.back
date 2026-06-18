import { Injectable } from '@nestjs/common';

import { StrategyEntity } from '../entities/strategy.entity';
import { StructuredStrategy } from '../types/structured-strategy.type';

@Injectable()
export class StrategyParseService {
  // parse mock 데이터 생성 로직
  parseStrategy(strategy: StrategyEntity): Promise<StructuredStrategy> {
    return Promise.resolve(this.createMockStructuredStrategy(strategy));
  }

  // TODO
  // mock data 생성 메서드
  private createMockStructuredStrategy(
    strategy: StrategyEntity,
  ): StructuredStrategy {
    return {
      version: 1,
      kind: 'ai_execution_plan',
      source: {
        prompt: strategy.prompt,
        market: strategy.market,
      },
      aiInstructions: {
        summary: '사용자의 자연어 전략을 기반으로 안전한 투자 판단을 수행한다.',
        decisionProcess: [
          '시장 뉴스와 거시 이벤트를 확인한다.',
          '지지/저항 구간과 주요 가격 흐름을 확인한다.',
          '근거가 부족하면 매매하지 않는다.',
          '과도한 레버리지와 올인을 피한다.',
          '수익 구간에서는 분할 익절을 고려한다.',
        ],
      },
      dataPermissions: {
        allowNewsSearch: true,
        allowMarketData: true,
        allowOnchainData: false,
      },
      marketDataConfig: {
        symbol: strategy.market,
        timeframes: ['15m', '1h', '4h', '1d'],
        primaryTimeframe: '1h',
      },
      riskPreferences: {
        riskLevel: 'conservative',
        maxIdeaExposureFraction: 0.3,
        positionSizeFraction: 0.1,
        allowLeverage: false,
      },
      humanReview: {
        requiredBeforeLiveTrading: true,
        requiredWhenConfidenceBelow: 0.7,
      },
    };
  }
}
