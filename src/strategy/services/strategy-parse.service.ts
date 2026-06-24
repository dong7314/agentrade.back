import { BadRequestException, Injectable } from '@nestjs/common';

import { LlmService } from '@/llm/services/llm.service';

import { StrategyEntity } from '../entities/strategy.entity';

import { isStructuredStrategy } from '../validators/structured-strategy.validator';

import { ParseSystemPrompt } from '../data/parse-system.prompt';
import { StructuredStrategy } from '../types/structured-strategy.type';

@Injectable()
export class StrategyParseService {
  constructor(private readonly llmService: LlmService) {}

  // parse 데이터 생성 로직
  async parseStrategy(strategy: StrategyEntity): Promise<StructuredStrategy> {
    const maxAttempts = 3;
    let previousInvalidResult: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const content = await this.llmService.createChatCompletionContent({
        systemPrompt: ParseSystemPrompt,
        userPrompt: this.createUserPrompt(strategy, {
          attempt,
          previousInvalidResult,
        }),
      });

      const result = this.parseLlmJsonContent(content);

      if (isStructuredStrategy(result)) {
        return this.normalizeStructuredStrategy(result, strategy);
      }

      previousInvalidResult = result;
    }

    throw new BadRequestException(
      'AI 구조화 결과가 유효하지 않습니다. 전략 내용을 조금 더 구체적으로 작성해주세요.',
    );
  }

  // 사용자 prompt 생성
  private createUserPrompt(
    strategy: StrategyEntity,
    context: {
      attempt: number;
      previousInvalidResult?: unknown;
    },
  ): string {
    const baseInput = {
      prompt: strategy.prompt,
      market: strategy.market,
      intervalMinutes: strategy.intervalMinutes,
      scheduleAnchorAt: strategy.scheduleAnchorAt.toISOString(),
    };

    // 첫 번째 시도일 때는 원본 입력만 전달
    if (context.attempt === 1) {
      return JSON.stringify(baseInput, null, 2);
    }

    // 두 번째 시도부터 틀린 base 값과 함께 전달하여 올바른 json 형태로 들어오도록 요청 지시문 추가
    return JSON.stringify(
      {
        instruction:
          'Previous output was invalid. Return a corrected JSON object that exactly matches the required schema.',
        originalInput: baseInput,
        previousInvalidResult: context.previousInvalidResult,
      },
      null,
      2,
    );
  }

  // llm이 잘못된 market을 반환해도 저장 시에 database 기준으로 마켓 등록
  private normalizeStructuredStrategy(
    structuredStrategy: StructuredStrategy,
    strategy: StrategyEntity,
  ): StructuredStrategy {
    return {
      ...structuredStrategy,
      source: {
        prompt: strategy.prompt,
        market: strategy.market,
      },
      judgment: strategy.strategyJudgmentMode,
      marketDataConfig: {
        ...structuredStrategy.marketDataConfig,
        symbol: strategy.market,
      },
      dataPermissions: {
        allowMarketData: strategy.allowMarketData,
        allowNewsSearch: strategy.allowNewsSearch,
      },
    };
  }

  // content를 json parse 실행
  // 잘못된 json일 시 object는 반환하되 원인 제공
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
