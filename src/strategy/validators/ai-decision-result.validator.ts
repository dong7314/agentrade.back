// src/strategy/validators/ai-decision-result.validator.ts

import { AiDecisionResult } from '../types/ai-decision-result.type';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isAiDecisionResult(value: unknown): value is AiDecisionResult {
  if (!isRecord(value)) return false;

  const order = value.suggestedOrder;

  if (!isRecord(order)) return false;

  const decisionValid =
    value.decision === 'buy' ||
    value.decision === 'sell' ||
    value.decision === 'hold';

  const confidenceValid =
    typeof value.confidence === 'number' &&
    value.confidence >= 0 &&
    value.confidence <= 1;

  const sizeValid =
    typeof order.sizeFraction === 'number' &&
    order.sizeFraction >= 0 &&
    order.sizeFraction <= 1;

  const orderTypeValid =
    order.orderType === 'market' || order.orderType === 'limit';

  const limitPriceValid =
    order.limitPrice === null || typeof order.limitPrice === 'number';

  const holdSizeValid = value.decision !== 'hold' || order.sizeFraction === 0;

  return (
    decisionValid &&
    confidenceValid &&
    typeof value.reason === 'string' &&
    isStringArray(value.evidence) &&
    isStringArray(value.riskNotes) &&
    sizeValid &&
    orderTypeValid &&
    limitPriceValid &&
    holdSizeValid
  );
}
