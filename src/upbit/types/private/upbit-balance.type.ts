export type UpbitBalance = {
  currency: string;
  balance: number;
  locked: number;
  avgBuyPrice: number | null;
  unitCurrency: string;
};
