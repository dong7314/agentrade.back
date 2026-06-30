import { StrategyRunStepResult } from '../strategy-run-result.type';

export type StrategyGraphStepName = StrategyRunStepResult['name'] | 'approval';

export const STEP_LABELS: Record<StrategyGraphStepName, string> = {
  market_data: '시장 데이터 수집',
  portfolio: '포트폴리오 조회',
  news: '뉴스 수집',
  asset_summary: '자산 요약 수집',
  ai_decision: 'AI 판단',
  risk_check: '리스크 체크',
  approval: '사용자 승인',
  order: '주문 처리',
};

export type StrategyGraphNodeStatus =
  | 'waiting'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'cancelled';

export type StrategyRunGraphSnapshotNode = {
  id: string;
  stepName: StrategyGraphStepName;
  label: string;
  status: StrategyGraphNodeStatus;
  summary: string | null;
  sequence: number;
  startedAt?: string;
  finishedAt?: string;
};

export type StrategyRunGraphSnapshotEdge = {
  source: string;
  target: string;
};

export type StrategyRunGraphSnapshot = {
  nodes: StrategyRunGraphSnapshotNode[];
  edges: StrategyRunGraphSnapshotEdge[];
  currentStepName: StrategyGraphStepName | null;
  updatedAt: string;
};
