// src/strategy/validators/ai-decision-result.validator.ts

import { isRecord } from '@/common/utils/is-record';
import { AiDecisionResult } from '../types/ai-decision-result.type';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
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
    order.orderType === 'market'
      ? order.limitPrice === null
      : typeof order.limitPrice === 'number' && order.limitPrice > 0;

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
