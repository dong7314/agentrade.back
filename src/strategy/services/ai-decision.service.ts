import { BadRequestException, Injectable } from '@nestjs/common';

import { LlmService } from '@/llm/services/llm.service';
import { isAiDecisionResult } from '../validators/ai-decision-result.validator';

import { RiskCheckResult } from '../types/risk-check-result.type';
import { AiDecisionResult } from '../types/ai-decision-result.type';
import { StructuredStrategy } from '../types/structured-strategy.type';
import { StrategyRunStepResult } from '../types/strategy-run-result.type';
import { AiDecisionSystemPrompt } from '../data/ai-decision-system-prompt';

@Injectable()
export class AiDecisionService {
  constructor(private readonly llmService: LlmService) {}

  async decide(input: {
    structuredStrategy: StructuredStrategy;
    steps: StrategyRunStepResult[];
    previousRiskCheck?: RiskCheckResult | null;
    aiDecisionAttempt: number;
  }): Promise<AiDecisionResult> {
    const maxSchemaRepairAttempts = 3;
    let previousInvalidResult: unknown;

    for (
      let schemaAttempt = 1;
      schemaAttempt <= maxSchemaRepairAttempts;
      schemaAttempt += 1
    ) {
      const content = await this.llmService.createChatCompletionContent({
        systemPrompt: AiDecisionSystemPrompt,
        userPrompt: this.createUserPrompt(input, {
          schemaAttempt,
          previousInvalidResult,
        }),
      });

      const result = this.parseLlmJsonContent(content);

      if (isAiDecisionResult(result)) {
        return result;
      }

      previousInvalidResult = result;
    }

    throw new BadRequestException('AI 판단 결과가 유효하지 않습니다.');
  }

  // 수집된 데이터를 가지고 사용자 프롬프트 생성
  private createUserPrompt(
    input: {
      structuredStrategy: StructuredStrategy;
      steps: StrategyRunStepResult[];
      previousRiskCheck?: RiskCheckResult | null;
      aiDecisionAttempt: number;
    },
    context: {
      schemaAttempt: number;
      previousInvalidResult?: unknown;
    },
  ): string {
    const baseInput = {
      strategy: input.structuredStrategy,
      collectedData: {
        marketData: this.findStep(input.steps, 'market_data'),
        portfolio: this.findStep(input.steps, 'portfolio'),
        news: this.findStep(input.steps, 'news'),
        assetSummary: this.findStep(input.steps, 'asset_summary'),
      },

      // LangGraph 판단 재시도 정보를 AI에게 전달
      aiDecisionAttempt: input.aiDecisionAttempt,

      // 이전 AI 판단이 risk check에서 왜 막혔는지 전달
      previousRiskCheck: this.toPreviousRiskCheckPrompt(
        input.previousRiskCheck,
      ),
    };

    if (context.schemaAttempt === 1) {
      return JSON.stringify(baseInput, null, 2);
    }

    return JSON.stringify(
      {
        instruction:
          'Previous output was invalid. Return corrected JSON matching the schema exactly. decision must be buy, sell, or hold. hold must use sizeFraction 0.',
        originalInput: baseInput,
        previousInvalidResult: context.previousInvalidResult,
      },
      null,
      2,
    );
  }

  private findStep(
    steps: StrategyRunStepResult[],
    name: StrategyRunStepResult['name'],
  ): StrategyRunStepResult | null {
    return steps.find((step) => step.name === name) ?? null;
  }

  private parseLlmJsonContent(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return {
        invalidReason: 'LLM response was not valid JSON.',
        rawContent: content,
      };
    }
  }

  private toPreviousRiskCheckPrompt(
    riskCheck?: RiskCheckResult | null,
  ): Record<string, unknown> | null {
    if (!riskCheck) {
      return null;
    }

    return {
      passed: riskCheck.passed,
      retryable: riskCheck.retryable,
      reason: riskCheck.reason,

      // AI가 같은 실수를 반복하지 않도록 violation만 요약해서 전달
      violations: riskCheck.violations.map((violation) => {
        return {
          code: violation.code,
          message: violation.message,
          minOrderAmountKrw: violation.minOrderAmountKrw,
          maxAllowedSizeFraction: violation.maxAllowedSizeFraction,
          estimatedOrderAmountKrw: violation.estimatedOrderAmountKrw,
        };
      }),
    };
  }
}
