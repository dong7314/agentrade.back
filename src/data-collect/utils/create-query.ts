import { StructuredStrategy } from '@/strategy/types/structured-strategy.type';

// 뉴스에 대한 쿼리 생성
export function createNewsQuery(
  structuredStrategy: StructuredStrategy,
): string {
  const symbol = structuredStrategy.marketDataConfig.symbol;

  if (symbol === 'KRW-BTC') return '비트코인';
  if (symbol === 'KRW-ETH') return '이더리움';
  if (symbol === 'KRW-XRP') return '리플';
  if (symbol === 'KRW-SOL') return '솔라나';

  return symbol;
}
