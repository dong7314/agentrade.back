import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { LlmChatCompletionResponseDto } from '../dto/llm-chat-completion.response.dto';

@Injectable()
export class LlmService {
  constructor(private readonly configService: ConfigService) {}

  async createChatCompletionContent(input: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
    const baseUrl = this.configService
      .getOrThrow<string>('LLM_BASE_URL')
      .replace(/\/$/, '');

    const apiKey = this.configService.get<string>('LLM_API_KEY') ?? '';
    const model = this.configService.getOrThrow<string>('LLM_MODEL');
    const timeoutMs = this.configService.getOrThrow<number>('LLM_TIMEOUT_MS');
    const maxTokens = this.configService.getOrThrow<number>('LLM_MAX_TOKENS');
    const temperature =
      this.configService.getOrThrow<number>('LLM_TEMPERATURE');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: {
            type: 'json_object',
          },
          messages: [
            {
              role: 'system',
              content: input.systemPrompt,
            },
            {
              role: 'user',
              content: input.userPrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(`LLM 서버 요청에 실패했습니다.`);
      }

      const data = (await response.json()) as LlmChatCompletionResponseDto;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new BadGatewayException('LLM 응답 content가 비어 있습니다.');
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'LLM 서버 요청 시간이 초과되었습니다.',
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
