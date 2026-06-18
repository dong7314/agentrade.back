export type StructuredStrategy = {
  version: 1;
  kind: 'ai_execution_plan';
  source: {
    prompt: string;
    market: string;
  };
  aiInstructions: {
    summary: string;
    decisionProcess: string[];
  };
  dataPermissions: {
    allowNewsSearch: boolean;
    allowMarketData: boolean;
    allowOnchainData: boolean;
  };
  marketDataConfig: {
    symbol: string;
    timeframes: string[];
    primaryTimeframe: string;
  };
  riskPreferences: {
    riskLevel: 'conservative' | 'balanced' | 'aggressive';
    maxIdeaExposureFraction: number;
    positionSizeFraction: number;
    allowLeverage: boolean;
  };
  humanReview: {
    requiredBeforeLiveTrading: boolean;
    requiredWhenConfidenceBelow: number;
  };
};
