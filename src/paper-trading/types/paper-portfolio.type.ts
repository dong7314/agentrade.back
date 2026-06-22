export type PaperPortfolio = {
  cashBalance: number;
  totalAssetValue: number;
  positions: {
    market: string;
    quantity: number;
    averageEntryPrice: number;
    currentPrice?: number;
  }[];
};
