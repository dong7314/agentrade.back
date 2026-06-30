import { Injectable } from '@nestjs/common';

import { StrategyEntity } from '../entities/strategy.entity';

import { StrategyExecutionGraphService } from './strategy-execution-graph.service';

import { StrategyRunResult } from '../types/strategy-run-result.type';

@Injectable()
export class StrategyExecutionService {
  constructor(private readonly graph: StrategyExecutionGraphService) {}

  async execute(input: {
    strategy: StrategyEntity;
    strategyRunId: number;
  }): Promise<StrategyRunResult> {
    // 기존 실행 진입점은 유지하고 내부만 LangGraph로 위임
    return this.graph.run(input);
  }
}
