export type UpbitOrderState = 'wait' | 'done' | 'cancel';

export type UpbitOrderDetailResponse = {
  uuid: string;
  side: 'bid' | 'ask';
  ord_type: 'limit' | 'price' | 'market';
  price: string | null;
  state: UpbitOrderState;
  market: string;
  created_at: string;
  volume: string | null;
  remaining_volume: string | null;
  paid_fee: string;
  locked: string;
  executed_volume: string;
  trades_count: number;
};

export type UpbitOrderDetail = {
  uuid: string;
  state: UpbitOrderState;
  market: string;
  price: number | null;
  volume: number | null;
  remainingVolume: number;
  executedVolume: number;
  paidFee: number;
  tradesCount: number;
};

export const UpbitOrderDetail = {
  fromResponse(data: UpbitOrderDetailResponse): UpbitOrderDetail {
    return {
      // Upbit 원본 응답의 snake_case와 문자열 숫자를 내부에서 쓰기 쉬운 형태로 변환
      uuid: data.uuid,
      state: data.state,
      market: data.market,
      price: data.price === null ? null : Number(data.price),
      volume: data.volume === null ? null : Number(data.volume),
      remainingVolume:
        data.remaining_volume === null ? 0 : Number(data.remaining_volume),
      executedVolume: Number(data.executed_volume),
      paidFee: Number(data.paid_fee),
      tradesCount: data.trades_count,
    };
  },
};
