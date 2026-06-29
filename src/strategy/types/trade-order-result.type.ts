import { AiOrderType, AiTradeDecision } from './ai-decision-result.type';

export type TradeOrderMode = 'paper' | 'live';

export type TradeOrderStatus =
  | 'created'
  | 'tested'
  | 'skipped'
  | 'failed'
  | 'cancelled';

export type TradeOrderResult = {
  mode: TradeOrderMode;
  market: string;
  decision: Exclude<AiTradeDecision, 'hold'> | null;
  orderType: AiOrderType;
  amountKrw: number | null;
  volume: number | null;
  priceKrw: number | null;
  status: TradeOrderStatus;
  externalOrderId: string | null;
  reason: string;
  // live 주문 상태 동기화 후 Upbit 원본 상태를 기록
  liveOrderState?: 'wait' | 'done' | 'cancel' | null;
  executedVolume?: number | null;
  remainingVolume?: number | null;
  paidFee?: number | null;
};
