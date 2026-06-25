export type UpbitCandle = {
  market: string;
  timeframe: string;
  openedAt: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
