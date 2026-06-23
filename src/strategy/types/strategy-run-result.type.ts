export type StrategyRunStepStatus = 'succeeded' | 'failed' | 'skipped';

export type StrategyRunStepResult = {
  name:
    | 'market_data'
    | 'portfolio'
    | 'news'
    | 'asset_summary'
    | 'ai_decision'
    | 'risk_check'
    | 'approval'
    | 'order';
  status: StrategyRunStepStatus;
  summary: string;
  output?: Record<string, unknown>;
};

export type StrategyRunResult = {
  decision: 'buy' | 'sell' | 'hold' | 'skip';
  reason: string;
  confidence: number;
  steps: StrategyRunStepResult[];
  strategy: {
    id: number;
    market: string;
    intervalMinutes: number;
  };
};
