import { LlmService } from '@/llm/services/llm.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { StructuredStrategy } from '../types/structured-strategy.type';
import { StrategyRunStepResult } from '../types/strategy-run-result.type';
import { AiDecisionResult } from '../types/ai-decision-result.type';
import { AiDecisionSystemPrompt } from '../data/ai-decision-system-prompt';
import { isAiDecisionResult } from '../validators/ai-decision-result.validator';

@Injectable()
export class AiDecisionService {
  constructor(private readonly llmService: LlmService) {}

  async decide(input: {
    structuredStrategy: StructuredStrategy;
    steps: StrategyRunStepResult[];
  }): Promise<AiDecisionResult> {
    const maxAttempts = 3;
    let previousInvalidResult: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const content = await this.llmService.createChatCompletionContent({
        systemPrompt: AiDecisionSystemPrompt,
        userPrompt: this.createUserPrompt(input, {
          attempt,
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
    },
    context: {
      attempt: number;
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
    };

    if (context.attempt === 1) {
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
}
