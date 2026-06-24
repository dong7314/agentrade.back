import { Injectable } from '@nestjs/common';

import { isRecord } from '@/common/utils/is-record';

import {
  RiskViolation,
  RiskCheckResult,
  MIN_UPBIT_ORDER_AMOUNT_KRW,
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

    if (input.strategyMode === StrategyMode.LIVE) {
      violations.push({
        code: 'LIVE_TRADING_NOT_SUPPORTED',
        message: '현재 단계에서는 live 주문 후보 생성을 허용하지 않습니다.',
        retryable: false,
      });
    }

    const estimatedOrderAmountKrw = this.estimateOrderAmountKrw({
      market: input.structuredStrategy.marketDataConfig.symbol,
      decision: orderDecision,
      sizeFraction: input.aiDecision.suggestedOrder.sizeFraction,
      collectedSteps: input.collectedSteps,
    });

    if (
      estimatedOrderAmountKrw !== null &&
      estimatedOrderAmountKrw < MIN_UPBIT_ORDER_AMOUNT_KRW
    ) {
      violations.push({
        code: 'ORDER_AMOUNT_TOO_LOW',
        message: `예상 주문 금액 ${estimatedOrderAmountKrw}원이 Upbit 최소 주문 금액 ${MIN_UPBIT_ORDER_AMOUNT_KRW}원보다 낮습니다.`,
        retryable: true,
        minOrderAmountKrw: MIN_UPBIT_ORDER_AMOUNT_KRW,
        estimatedOrderAmountKrw,
      });
    }

    if (violations.length > 0) {
      return {
        passed: false,
        retryable: violations.every((violation) => violation.retryable),
        reason: 'Risk check를 통과하지 못했습니다.',
        violations,
        adjustedOrder: null,
      };
    }

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
      },
    };
  }

  // 예상 원화 주문 금액 계산
  // buy일 때는 사용 가능한 KRW 금액에 주문 비중을 곱하고,
  // sell일 때는 현재 전략 market의 보유 수량 * 최신 종가 * 주문 비중으로 계산
  // 여기서 계산한 값이 Upbit 최소 주문 금액 5,000원보다 작은지 검사
  private estimateOrderAmountKrw(input: {
    market: string;
    decision: 'buy' | 'sell';
    sizeFraction: number;
    collectedSteps: StrategyRunStepResult[];
  }): number | null {
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

    if (latestClose === null) {
      return null;
    }

    if (input.decision === 'buy') {
      const availableKrw = this.extractAvailableKrw(portfolioStep.output);

      if (availableKrw === null) {
        return null;
      }

      return availableKrw * input.sizeFraction;
    }

    const baseAssetAmount = this.extractBaseAssetAmount({
      market: input.market,
      output: portfolioStep.output,
    });

    if (baseAssetAmount === null) {
      return null;
    }

    return baseAssetAmount * latestClose * input.sizeFraction;
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
