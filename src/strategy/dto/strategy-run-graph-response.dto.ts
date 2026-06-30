import { StrategyRunEntity } from '../entities/strategy-run.entity';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { StrategyRunStepResult } from '../types/strategy-run-result.type';
import { StrategyOrderApprovalEntity } from '../entities/strategy-order-approval.entity';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

type GraphNodeStatus =
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

type GraphStepName = StrategyRunStepResult['name'];

const GRAPH_STEPS: {
  id: GraphStepName;
  label: string;
}[] = [
  { id: 'market_data', label: '시장 데이터 수집' },
  { id: 'portfolio', label: '포트폴리오 조회' },
  { id: 'news', label: '뉴스 수집' },
  { id: 'asset_summary', label: '자산 요약 수집' },
  { id: 'ai_decision', label: 'AI 판단' },
  { id: 'risk_check', label: '리스크 체크' },
  { id: 'order', label: '주문 처리' },
];

const STEP_LABELS: Record<GraphStepName, string> = {
  market_data: '시장 데이터 수집',
  portfolio: '포트폴리오 조회',
  news: '뉴스 수집',
  asset_summary: '자산 요약 수집',
  ai_decision: 'AI 판단',
  risk_check: '리스크 체크',
  approval: '사용자 승인',
  order: '주문 처리',
};

export class StrategyRunGraphNodeDto {
  id!: string;
  stepName!: string;
  label!: string;
  status!: GraphNodeStatus;
  summary!: string | null;
  sequence!: number;
}
export class StrategyRunGraphEdgeDto {
  source!: string;
  target!: string;
}

export class StrategyRunGraphResponseDto {
  runId!: number;
  strategyId!: number;
  status!: StrategyRunStatus;
  nodes!: StrategyRunGraphNodeDto[];
  edges!: StrategyRunGraphEdgeDto[];

  static fromEntity(
    run: StrategyRunEntity,
    approval?: StrategyOrderApprovalEntity | null,
  ): StrategyRunGraphResponseDto {
    if (
      run.graphSnapshot &&
      (run.status === StrategyRunStatus.RUNNING || !run.result)
    ) {
      const nodesWithApproval = this.appendApprovalNode(
        run.graphSnapshot.nodes,
        approval,
      );

      return {
        runId: run.id,
        strategyId: run.strategyId,
        status: run.status,
        nodes: nodesWithApproval,
        edges: this.createSequentialEdges(nodesWithApproval),
      };
    }

    const steps = run.result?.steps ?? [];

    // 아직 result가 없으면 고정된 대기 node를 반환
    if (steps.length === 0) {
      const waitingNodes: StrategyRunGraphNodeDto[] = GRAPH_STEPS.map(
        (graphStep, index) => {
          return {
            id: `${index + 1}-${graphStep.id}`,
            stepName: graphStep.id,
            label: graphStep.label,
            status: 'waiting',
            summary: null,
            sequence: index + 1,
          };
        },
      );

      return {
        runId: run.id,
        strategyId: run.strategyId,
        status: run.status,
        nodes: waitingNodes,
        edges: this.createSequentialEdges(waitingNodes),
      };
    }

    // 실제 실행된 step 순서대로 node 생성
    // retry가 있으면 ai_decision, risk_check가 여러 번 표시됨
    const nodes: StrategyRunGraphNodeDto[] = steps.map((step, index) => {
      return {
        id: `${index + 1}-${step.name}`,
        stepName: step.name,
        label: STEP_LABELS[step.name],
        status: step.status,
        summary: step.summary,
        sequence: index + 1,
      };
    });

    // approval이 있으면 사용자 승인 node를 마지막에 추가
    const nodesWithApproval = this.appendApprovalNode(nodes, approval);

    return {
      runId: run.id,
      strategyId: run.strategyId,
      status: run.status,
      nodes: nodesWithApproval,
      edges: this.createSequentialEdges(nodesWithApproval),
    };
  }

  private static appendApprovalNode(
    nodes: StrategyRunGraphNodeDto[],
    approval?: StrategyOrderApprovalEntity | null,
  ): StrategyRunGraphNodeDto[] {
    if (!approval) {
      return nodes;
    }

    // 이미 approval node가 있으면 중복 추가하지 않음
    const hasApprovalNode = nodes.some((node) => node.stepName === 'approval');

    if (hasApprovalNode) {
      return nodes.map((node) => {
        if (node.stepName !== 'approval') {
          return node;
        }

        return {
          ...node,
          status: this.toApprovalGraphStatus(approval.status),
          summary: this.createApprovalSummary(approval.status),
        };
      });
    }

    const sequence = nodes.length + 1;

    return [
      ...nodes,
      {
        id: `${sequence}-approval`,
        stepName: 'approval',
        label: '사용자 승인',
        status: this.toApprovalGraphStatus(approval.status),
        summary: this.createApprovalSummary(approval.status),
        sequence,
      },
    ];
  }

  private static toApprovalGraphStatus(
    status: StrategyOrderApprovalStatus,
  ): GraphNodeStatus {
    if (status === StrategyOrderApprovalStatus.PENDING) {
      return 'pending';
    }

    if (status === StrategyOrderApprovalStatus.APPROVED) {
      return 'approved';
    }

    if (status === StrategyOrderApprovalStatus.REJECTED) {
      return 'rejected';
    }

    if (status === StrategyOrderApprovalStatus.EXECUTED) {
      return 'executed';
    }

    if (status === StrategyOrderApprovalStatus.CANCELLED) {
      return 'cancelled';
    }

    return 'failed';
  }

  private static createApprovalSummary(
    status: StrategyOrderApprovalStatus,
  ): string {
    if (status === StrategyOrderApprovalStatus.PENDING) {
      return '사용자 수락 또는 거절을 기다리는 중입니다.';
    }

    if (status === StrategyOrderApprovalStatus.APPROVED) {
      return '사용자가 주문 후보를 승인했고 주문 접수가 진행되었습니다.';
    }

    if (status === StrategyOrderApprovalStatus.REJECTED) {
      return '사용자가 주문 후보를 거절했습니다.';
    }

    if (status === StrategyOrderApprovalStatus.EXECUTED) {
      return '사용자 승인 후 주문 실행이 완료되었습니다.';
    }

    if (status === StrategyOrderApprovalStatus.CANCELLED) {
      return '승인된 live 주문이 취소되었습니다.';
    }

    return '사용자 승인 처리 중 오류가 발생했습니다.';
  }

  private static createSequentialEdges(
    nodes: StrategyRunGraphNodeDto[],
  ): StrategyRunGraphEdgeDto[] {
    return nodes.slice(0, -1).map((node, index) => {
      return {
        source: node.id,
        target: nodes[index + 1].id,
      };
    });
  }
}
