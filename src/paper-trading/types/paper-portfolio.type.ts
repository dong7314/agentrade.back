export type PaperPortfolio = {
  cashBalance: number;
  totalAssetValue: number;
  totalMarketValueKrw: number;
  totalUnrealizedPnlKrw: number;
  totalUnrealizedPnlRate: number;
  positions: {
    market: string;
    quantity: number;
    averageEntryPrice: number;
    currentPrice: number;
    investedAmountKrw: number;
    marketValueKrw: number;
    unrealizedPnlKrw: number;
    unrealizedPnlRate: number;
    allocationRatio: number;
  }[];
};
