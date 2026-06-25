import { AiOrderType, AiTradeDecision } from './ai-decision-result.type';

export type TradeOrderMode = 'paper' | 'live';

export type TradeOrderStatus = 'created' | 'tested' | 'skipped' | 'failed';

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
};
