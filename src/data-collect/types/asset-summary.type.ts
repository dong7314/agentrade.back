export type AssetSummarySignal = 'BUY' | 'SELL' | 'NEUTRAL';

export type AssetSummary = {
  source: 'upbit_datalab_asset_summary';
  market: string;
  symbol: string;
  url: string;
  fetchedAt: Date;
  rawText: string;
  asset: {
    koreanName: string | null;
    englishName: string | null;
    marketCapRank: number | null;
  };
  price: {
    tradePrice: number | null;
    return24hPercent: number | null;
    highPrice24h: number | null;
    lowPrice24h: number | null;
  };
  marketCap: {
    value: number | null;
    change24hPercent: number | null;
  };
  tradingVolume: {
    value24h: number | null;
    change24hPercent: number | null;
  };
  upbitPremium: {
    valuePercent: number | null;
    delta: number | null;
  };
  fearGreed: {
    score: number | null;
    label: string | null;
    prevScore24h: number | null;
    change24hPercent: number | null;
  };
  technicalAnalysis: {
    score: number | null;
    signal: AssetSummarySignal | null;
    rsi: {
      value: number | null;
      signal: AssetSummarySignal | null;
    };
    bollingerBand: {
      percentB: number | null;
      signal: AssetSummarySignal | null;
    };
    stochastic: {
      percentK: number | null;
      signal: AssetSummarySignal | null;
    };
  };
  volatility: {
    volatilityText: string | null;
    betaText: string | null;
    riskAdjustedReturnText: string | null;
  };
};
