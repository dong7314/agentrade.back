import { Injectable } from '@nestjs/common';

import { isRecord } from '@/common/utils/is-record';

import {
  RiskViolation,
  RiskCheckResult,
  MIN_UPBIT_ORDER_AMOUNT_KRW,
  EstimatedOrder,
} from '../types/risk-check-result.type';
import { StrategyMode } from '../enums/strategy-mode.enum';
import { AiDecisionResult } from '../types/ai-decision-result.type';
import { StructuredStrategy } from '../types/structured-strategy.type';
import { StrategyRunStepResult } from '../types/strategy-run-result.type';

@Injectable()
export class RiskCheckService {
  check(input: {
    aiDecision: AiDecisionResult;
    structuredStrategy: StructuredStrategy;
    strategyMode: StrategyMode;
    collectedSteps: StrategyRunStepResult[];
  }): RiskCheckResult {
    const violations: RiskViolation[] = [];

    // hold 판단은 주문 후보를 만들지 않고 여기서 종료
    if (input.aiDecision.decision === 'hold') {
      return {
        passed: false,
        retryable: false,
        reason: 'AI 판단이 hold이므로 주문 후보를 생성하지 않습니다.',
        violations: [
          {
            code: 'DECISION_HOLD',
            message: 'AI 판단이 hold이므로 주문 후보를 생성하지 않습니다.',
            retryable: false,
          },
        ],
        adjustedOrder: null,
      };
    }

    // 주문 계산에 필요한 필수 데이터 수집 실패 여부 확인
    const failedRequiredStep = input.collectedSteps.find(
      (step) =>
        (step.name === 'market_data' || step.name === 'portfolio') &&
        step.status === 'failed',
    );

    if (failedRequiredStep) {
      violations.push({
        code: 'REQUIRED_DATA_FAILED',
        message: `${failedRequiredStep.name} 수집 실패로 주문 후보를 생성할 수 없습니다.`,
        retryable: false,
      });
    }

    const orderDecision = input.aiDecision.decision;

    // AI 신뢰도와 주문 비중이 전략의 위험 설정을 넘지 않는지 검사
    const minimumConfidence =
      input.structuredStrategy.humanReview.requiredWhenConfidenceBelow;

    if (input.aiDecision.confidence < minimumConfidence) {
      violations.push({
        code: 'CONFIDENCE_TOO_LOW',
        message: `confidence ${input.aiDecision.confidence}가 최소 기준 ${minimumConfidence}보다 낮습니다.`,
        retryable: true,
      });
    }

    if (input.aiDecision.suggestedOrder.sizeFraction <= 0) {
      violations.push({
        code: 'SIZE_FRACTION_ZERO',
        message: 'AI가 제안한 주문 비중이 0 이하입니다.',
        retryable: true,
      });
    }

    const maxAllowedSizeFraction =
      input.structuredStrategy.riskPreferences.maxIdeaExposureFraction;

    if (input.aiDecision.suggestedOrder.sizeFraction > maxAllowedSizeFraction) {
      violations.push({
        code: 'SIZE_FRACTION_TOO_HIGH',
        message: `AI 제안 비중 ${input.aiDecision.suggestedOrder.sizeFraction}이 최대 허용 비중 ${maxAllowedSizeFraction}보다 큽니다.`,
        retryable: true,
        maxAllowedSizeFraction,
      });
    }

    // 주문 타입과 가격 정보를 기준으로 예상 주문 금액 계산
    const suggestedOrder = input.aiDecision.suggestedOrder;

    let estimatedOrder: EstimatedOrder | null = null;

    if (
      suggestedOrder.orderType === 'limit' &&
      (suggestedOrder.limitPrice === null || suggestedOrder.limitPrice <= 0)
    ) {
      violations.push({
        code: 'LIMIT_PRICE_REQUIRED',
        message: '지정가 주문에는 0보다 큰 limitPrice가 필요합니다.',
        retryable: true,
      });
    } else {
      estimatedOrder = this.estimateOrder({
        market: input.structuredStrategy.marketDataConfig.symbol,
        decision: orderDecision,
        orderType: suggestedOrder.orderType,
        limitPrice: suggestedOrder.limitPrice,
        sizeFraction: suggestedOrder.sizeFraction,
        collectedSteps: input.collectedSteps,
      });
    }

    // 지정가 가격 누락처럼 이미 원인이 명확한 경우 중복 실패 사유를 막음
    const hasLimitPriceViolation = violations.some(
      (violation) => violation.code === 'LIMIT_PRICE_REQUIRED',
    );

    if (estimatedOrder === null && !hasLimitPriceViolation) {
      violations.push({
        code: 'ORDER_ESTIMATION_FAILED',
        message: '주문 금액과 수량을 계산할 수 없습니다.',
        retryable: false,
      });
    } else if (
      estimatedOrder !== null &&
      estimatedOrder.amountKrw < MIN_UPBIT_ORDER_AMOUNT_KRW
    ) {
      violations.push({
        code: 'ORDER_AMOUNT_TOO_LOW',
        message: `예상 주문 금액 ${estimatedOrder.amountKrw}원이 Upbit 최소 주문 금액 ${MIN_UPBIT_ORDER_AMOUNT_KRW}원보다 낮습니다.`,
        retryable: true,
        minOrderAmountKrw: MIN_UPBIT_ORDER_AMOUNT_KRW,
        estimatedOrderAmountKrw: estimatedOrder.amountKrw,
      });
    }

    if (estimatedOrder === null || violations.length > 0) {
      return {
        passed: false,
        retryable: violations.every((violation) => violation.retryable),
        reason: 'Risk check를 통과하지 못했습니다.',
        violations,
        adjustedOrder: null,
      };
    }

    // 모든 검사를 통과하면 실행 가능한 주문 후보를 반환
    return {
      passed: true,
      retryable: false,
      reason: 'Risk check를 통과했습니다.',
      violations: [],
      adjustedOrder: {
        decision: orderDecision,
        sizeFraction: input.aiDecision.suggestedOrder.sizeFraction,
        orderType: input.aiDecision.suggestedOrder.orderType,
        limitPrice: input.aiDecision.suggestedOrder.limitPrice,
        estimatedOrderAmountKrw: estimatedOrder.amountKrw,
        estimatedVolume: estimatedOrder.volume,
        priceKrw: estimatedOrder.priceKrw,
      },
    };
  }

  // 포트폴리오와 최신 가격을 기준으로 예상 주문 금액과 수량 계산
  private estimateOrder(input: {
    market: string;
    decision: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    limitPrice: number | null;
    sizeFraction: number;
    collectedSteps: StrategyRunStepResult[];
  }): EstimatedOrder | null {
    const portfolioStep = input.collectedSteps.find(
      (step) => step.name === 'portfolio',
    );

    const marketDataStep = input.collectedSteps.find(
      (step) => step.name === 'market_data',
    );

    if (!portfolioStep?.output || !marketDataStep?.output) {
      return null;
    }

    const latestClose = this.extractLatestClose(marketDataStep.output);

    const priceKrw =
      input.orderType === 'limit' ? input.limitPrice : latestClose;

    if (priceKrw === null || priceKrw <= 0) {
      return null;
    }

    if (latestClose === null) {
      return null;
    }

    if (input.decision === 'buy') {
      const availableKrw = this.extractAvailableKrw(portfolioStep.output);

      if (availableKrw === null) {
        return null;
      }

      const amountKrw = availableKrw * input.sizeFraction;

      return {
        amountKrw,
        volume: amountKrw / priceKrw,
        priceKrw,
      };
    }

    const baseAssetAmount = this.extractBaseAssetAmount({
      market: input.market,
      output: portfolioStep.output,
    });

    if (baseAssetAmount === null) {
      return null;
    }

    const volume = baseAssetAmount * input.sizeFraction;

    return {
      amountKrw: volume * priceKrw,
      volume,
      priceKrw,
    };
  }

  private extractLatestClose(output: Record<string, unknown>): number | null {
    // primaryTimeframe과 일치하는 candle group을 우선 사용
    // 없으면 첫 번째 candle group의 latestClose를 fallback으로 사용
    const primaryTimeframe = output.primaryTimeframe;
    const primaryGroup =
      typeof primaryTimeframe === 'string'
        ? this.findRecord(output.candleGroups, (group) => {
            return group.timeframe === primaryTimeframe;
          })
        : null;

    const candleGroup = primaryGroup ?? this.firstRecord(output.candleGroups);

    if (!candleGroup) {
      return null;
    }

    const latestClose = candleGroup.latestClose;

    return typeof latestClose === 'number' ? latestClose : null;
  }

  private extractAvailableKrw(output: Record<string, unknown>): number | null {
    // paper 매수 가능 금액은 cashBalance를 그대로 사용
    if (typeof output.cashBalance === 'number') {
      return output.cashBalance;
    }

    // UpbitBalance에서 currency === 'KRW'인 항목의 balance가 주문 가능한 원화
    const krwBalance = this.findRecord(output.balances, (balance) => {
      return balance.currency === 'KRW';
    });

    if (!krwBalance) {
      return null;
    }

    const balance = krwBalance.balance;

    return typeof balance === 'number' ? balance : null;
  }

  private extractBaseAssetAmount(input: {
    market: string;
    output: Record<string, unknown>;
  }): number | null {
    const symbol = this.extractBaseSymbol(input.market);

    if (symbol === null) {
      return null;
    }

    // paper portfolio output에서는 positions 배열에서 현재 market과 일치하는 포지션을 검색
    const position = this.findRecord(input.output.positions, (item) => {
      return item.market === input.market;
    });

    if (position) {
      const quantity = position.quantity;

      if (typeof quantity === 'number') {
        return quantity;
      }
    }

    return this.extractLiveBaseAssetAmount({
      symbol,
      output: input.output,
    });
  }

  private extractLiveBaseAssetAmount(input: {
    symbol: string;
    output: Record<string, unknown>;
  }): number | null {
    // live Upbit portfolio output에서는 balances 배열에서 현재 코인 심볼과 일치하는 항목을 검색
    const baseBalance = this.findRecord(input.output.balances, (balance) => {
      return balance.currency === input.symbol;
    });

    if (!baseBalance) {
      return null;
    }

    const balance = baseBalance.balance;

    return typeof balance === 'number' ? balance : null;
  }

  private extractBaseSymbol(market: string): string | null {
    // Upbit market은 KRW-BTC 형태이므로 뒤쪽 BTC 부분만 뽑아 live balances의 currency와 비교
    const [, symbol] = market.split('-');

    return symbol?.toUpperCase() ?? null;
  }

  private firstRecord(value: unknown): Record<string, unknown> | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const items = value as unknown[];
    const first = items[0];

    return isRecord(first) ? first : null;
  }

  private findRecord(
    value: unknown,
    predicate: (item: Record<string, unknown>) => boolean,
  ): Record<string, unknown> | null {
    if (!Array.isArray(value)) {
      return null;
    }

    const items = value as unknown[];

    for (const item of items) {
      if (isRecord(item) && predicate(item)) {
        return item;
      }
    }

    return null;
  }
}
