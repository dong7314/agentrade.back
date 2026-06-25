export type UpbitOrderSide = 'bid' | 'ask';

export type UpbitOrderType = 'limit' | 'price' | 'market';

export type UpbitCreateOrderInput = {
  accessKey: string;
  secretKey: string;
  market: string;
  side: UpbitOrderSide;
  ordType: UpbitOrderType;
  price?: string;
  volume?: string;
  identifier?: string;
};

export type UpbitOrderResponse = {
  uuid: string;
  side: UpbitOrderSide;
  ord_type: UpbitOrderType;
  price: string | null;
  volume: string | null;
  state: string;
  market: string;
  created_at: string;
};
