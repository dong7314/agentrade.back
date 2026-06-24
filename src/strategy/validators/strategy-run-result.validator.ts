import { StrategyRunResult } from '../types/strategy-run-result.type';

export function isStrategyRunResult(
  value: unknown,
): value is StrategyRunResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    record.decision !== 'buy' &&
    record.decision !== 'sell' &&
    record.decision !== 'hold'
  ) {
    return false;
  }

  if (typeof record.reason !== 'string') {
    return false;
  }

  if (typeof record.confidence !== 'number') {
    return false;
  }

  if (!Array.isArray(record.steps)) {
    return false;
  }

  return true;
}
