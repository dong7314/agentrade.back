import { AiOrderType, AiTradeDecision } from './ai-decision-result.type';

export const MIN_UPBIT_ORDER_AMOUNT_KRW = 5000;

// 리스크 위반 코드
export type RiskViolationCode =
  | 'DECISION_HOLD'
  | 'CONFIDENCE_TOO_LOW'
  | 'SIZE_FRACTION_ZERO'
  | 'SIZE_FRACTION_TOO_HIGH'
  | 'ORDER_AMOUNT_TOO_LOW'
  | 'LIVE_TRADING_NOT_SUPPORTED'
  | 'REQUIRED_DATA_FAILED';

// 리스크 위반 타입
export type RiskViolation = {
  code: RiskViolationCode;
  message: string;
  retryable: boolean;
  minOrderAmountKrw?: number;
  maxAllowedSizeFraction?: number;
  estimatedOrderAmountKrw?: number;
};

// 실제 주문 타입
export type RiskAdjustedOrder = {
  decision: Exclude<AiTradeDecision, 'hold'>;
  sizeFraction: number;
  orderType: AiOrderType;
  limitPrice: number | null;
};

export type RiskCheckResult = {
  passed: boolean;
  retryable: boolean;
  reason: string;
  violations: RiskViolation[];
  adjustedOrder: RiskAdjustedOrder | null;
};
