import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { StrategyRunEntity } from '../entities/strategy-run.entity';
import {
  STEP_LABELS,
  StrategyGraphStepName,
  StrategyGraphNodeStatus,
  StrategyRunGraphSnapshot,
  StrategyRunGraphSnapshotNode,
} from '../types/graph/strategy-run-graph-snapshot.type';

@Injectable()
export class StrategyRunProgressService {
  constructor(
    @InjectRepository(StrategyRunEntity)
    private readonly strategyRunRepository: Repository<StrategyRunEntity>,
  ) {}

  async reset(strategyRunId: number): Promise<void> {
    // 새 run 시작 시 이전 snapshot을 비움
    await this.strategyRunRepository.update(strategyRunId, {
      graphSnapshot: {
        nodes: [],
        edges: [],
        currentStepName: null,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async markRunning(input: {
    strategyRunId: number;
    stepName: StrategyGraphStepName;
    summary: string;
  }): Promise<void> {
    const snapshot = await this.getSnapshot(input.strategyRunId);
    const sequence = snapshot.nodes.length + 1;

    // node 시작 시 새 node를 추가. retry가 있으면 같은 stepName도 여러 번 쌓이도록
    const node: StrategyRunGraphSnapshotNode = {
      id: `${sequence}-${input.stepName}`,
      stepName: input.stepName,
      label: STEP_LABELS[input.stepName],
      status: 'running',
      summary: input.summary,
      sequence,
      startedAt: new Date().toISOString(),
    };

    snapshot.nodes.push(node);
    snapshot.edges = this.createSequentialEdges(snapshot.nodes);
    snapshot.currentStepName = input.stepName;
    snapshot.updatedAt = new Date().toISOString();

    await this.strategyRunRepository.update(input.strategyRunId, {
      graphSnapshot: snapshot,
    });
  }

  async markCompleted(input: {
    strategyRunId: number;
    stepName: StrategyGraphStepName;
    status: StrategyGraphNodeStatus;
    summary: string;
  }): Promise<void> {
    const snapshot = await this.getSnapshot(input.strategyRunId);

    // 가장 최근 running node를 완료 상태로 변경
    const node = [...snapshot.nodes]
      .reverse()
      .find(
        (item) => item.stepName === input.stepName && item.status === 'running',
      );

    if (!node) {
      return;
    }

    node.status = input.status;
    node.summary = input.summary;
    node.finishedAt = new Date().toISOString();

    snapshot.currentStepName = null;
    snapshot.updatedAt = new Date().toISOString();

    await this.strategyRunRepository.update(input.strategyRunId, {
      graphSnapshot: snapshot,
    });
  }

  async markFailed(input: {
    strategyRunId: number;
    stepName: StrategyGraphStepName;
    error: unknown;
  }): Promise<void> {
    await this.markCompleted({
      strategyRunId: input.strategyRunId,
      stepName: input.stepName,
      status: 'failed',
      summary:
        input.error instanceof Error
          ? input.error.message
          : '알 수 없는 오류가 발생했습니다.',
    });
  }

  private async getSnapshot(
    strategyRunId: number,
  ): Promise<StrategyRunGraphSnapshot> {
    const run = await this.strategyRunRepository.findOneBy({
      id: strategyRunId,
    });

    return (
      run?.graphSnapshot ?? {
        nodes: [],
        edges: [],
        currentStepName: null,
        updatedAt: new Date().toISOString(),
      }
    );
  }

  private createSequentialEdges(nodes: StrategyRunGraphSnapshotNode[]) {
    return nodes.slice(0, -1).map((node, index) => {
      return {
        source: node.id,
        target: nodes[index + 1].id,
      };
    });
  }
}
