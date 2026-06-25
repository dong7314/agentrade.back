export type UpbitTickerResponse = {
  market: string;
  trade_price: number;
  signed_change_rate: number;
  high_price: number;
  low_price: number;
  acc_trade_volume_24h: number;
  acc_trade_price_24h: number;
};

export type UpbitTicker = {
  market: string;
  tradePrice: number;
  signedChangeRate: number;
  highPrice: number;
  lowPrice: number;
  accTradeVolume24h: number;
  accTradePrice24h: number;
};
