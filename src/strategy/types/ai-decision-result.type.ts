export type AiTradeDecision = 'buy' | 'sell' | 'hold';

export type AiOrderType = 'market' | 'limit';

export type AiSuggestedOrder = {
  // buy일 때: 사용 가능한 KRW의 몇 %를 쓸지
  // sell일 때: 보유 코인의 몇 %를 팔지
  // hold일 때: 0
  sizeFraction: number;
  // 나중에 시장가/지정가를 구분하기 위한 값
  orderType: AiOrderType;
  // limit 주문일 때만 사용
  limitPrice: number | null;
};

export type AiDecisionResult = {
  decision: AiTradeDecision;
  confidence: number;
  reason: string;
  evidence: string[];
  riskNotes: string[];
  suggestedOrder: AiSuggestedOrder;
};
