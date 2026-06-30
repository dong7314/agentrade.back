import { z } from 'zod/v4';
import { StateSchema } from '@langchain/langgraph';

import { StrategyEntity } from '../../entities/strategy.entity';

import {
  StrategyRunResult,
  StrategyRunStepResult,
} from '../strategy-run-result.type';
import { RiskCheckResult } from '../risk-check-result.type';
import { AiDecisionResult } from '../ai-decision-result.type';
import { StructuredStrategy } from '../structured-strategy.type';

export const StrategyGraphStateSchema = new StateSchema({
  strategy: z.custom<StrategyEntity>(),
  strategyRunId: z.number(),

  // prepare node에서 채움
  structuredStrategy: z.custom<StructuredStrategy>().optional(),

  // collect node 결과
  collectedSteps: z.array(z.custom<StrategyRunStepResult>()).default(() => []),

  // 전체 step 누적
  steps: z.array(z.custom<StrategyRunStepResult>()).default(() => []),

  aiDecision: z.custom<AiDecisionResult>().optional(),
  riskCheck: z.custom<RiskCheckResult>().optional(),
  orderStep: z.custom<StrategyRunStepResult>().optional(),

  // AI 판단 node가 몇 번 실행됐는지 기록
  // 첫 AI 판단도 1회로 계산하고, risk retry로 다시 판단하면 2, 3으로 증가
  aiDecisionAttemptCount: z.number().default(0),

  result: z.custom<StrategyRunResult>().optional(),
});

export type StrategyGraphState = typeof StrategyGraphStateSchema.State;
