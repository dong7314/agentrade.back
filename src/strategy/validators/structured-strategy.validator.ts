import { StructuredStrategy } from '../types/structured-strategy.type';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isRiskLevel(
  value: unknown,
): value is StructuredStrategy['riskPreferences']['riskLevel'] {
  return (
    value === 'conservative' || value === 'balanced' || value === 'aggressive'
  );
}

export function isStructuredStrategy(
  value: unknown,
): value is StructuredStrategy {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version !== 1) {
    return false;
  }

  if (value.kind !== 'ai_execution_plan') {
    return false;
  }

  if (!isRecord(value.source)) {
    return false;
  }

  if (
    typeof value.source.prompt !== 'string' ||
    typeof value.source.market !== 'string'
  ) {
    return false;
  }

  if (!isRecord(value.aiInstructions)) {
    return false;
  }

  if (
    typeof value.aiInstructions.summary !== 'string' ||
    !isStringArray(value.aiInstructions.decisionProcess)
  ) {
    return false;
  }

  if (!isRecord(value.dataPermissions)) {
    return false;
  }

  if (
    typeof value.dataPermissions.allowNewsSearch !== 'boolean' ||
    typeof value.dataPermissions.allowMarketData !== 'boolean' ||
    typeof value.dataPermissions.allowOnchainData !== 'boolean'
  ) {
    return false;
  }

  if (!isRecord(value.marketDataConfig)) {
    return false;
  }

  if (
    typeof value.marketDataConfig.symbol !== 'string' ||
    !isStringArray(value.marketDataConfig.timeframes) ||
    typeof value.marketDataConfig.primaryTimeframe !== 'string'
  ) {
    return false;
  }

  if (!isRecord(value.riskPreferences)) {
    return false;
  }

  if (
    !isRiskLevel(value.riskPreferences.riskLevel) ||
    typeof value.riskPreferences.maxIdeaExposureFraction !== 'number' ||
    typeof value.riskPreferences.positionSizeFraction !== 'number' ||
    typeof value.riskPreferences.allowLeverage !== 'boolean'
  ) {
    return false;
  }

  if (!isRecord(value.humanReview)) {
    return false;
  }

  if (
    typeof value.humanReview.requiredBeforeLiveTrading !== 'boolean' ||
    typeof value.humanReview.requiredWhenConfidenceBelow !== 'number'
  ) {
    return false;
  }

  return true;
}
