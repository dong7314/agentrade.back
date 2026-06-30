import {
  Logger,
  Injectable,
  HttpException,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { LlmChatCompletionResponseDto } from '../dto/llm-chat-completion.response.dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

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
        // llama.cpp가 4xx/5xx를 반환하면 status와 body 일부를 로그로 남김
        const errorBody = await response.text().catch(() => '');

        this.logger.warn(
          JSON.stringify({
            message: 'LLM server returned non-2xx response',
            status: response.status,
            statusText: response.statusText,
            body: errorBody.slice(0, 1000),
            baseUrl,
            model,
          }),
        );

        throw new ServiceUnavailableException(
          `LLM 서버 요청에 실패했습니다. status=${response.status}`,
        );
      }

      const data = (await response.json()) as LlmChatCompletionResponseDto;
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== 'string') {
        throw new BadGatewayException('LLM 응답 content가 비어 있습니다.');
      }

      return content;
    } catch (error) {
      // 위에서 직접 만든 Nest 예외는 그대로 밖으로 전달
      if (error instanceof HttpException) {
        throw error;
      }

      const errorName = error instanceof Error ? error.name : 'UnknownError';
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCause =
        error instanceof Error && error.cause
          ? this.stringifyErrorCause(error.cause)
          : undefined;

      // fetch failed, ECONNREFUSED, timeout 같은 실제 원인을 로그로 확인하기 위함
      this.logger.error(
        JSON.stringify({
          message: 'LLM chat completion fetch failed',
          errorName,
          errorMessage,
          errorCause,
          baseUrl,
          model,
          timeoutMs,
          maxTokens,
          temperature,
        }),
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ServiceUnavailableException(
          'LLM 서버 요청 시간이 초과되었습니다.',
        );
      }

      throw new ServiceUnavailableException(
        `LLM 서버 호출 중 오류가 발생했습니다: ${errorMessage}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private stringifyErrorCause(cause: unknown): string {
    if (cause instanceof Error) {
      return `${cause.name}: ${cause.message}`;
    }

    if (typeof cause === 'string') {
      return cause;
    }

    try {
      return JSON.stringify(cause);
    } catch {
      return 'Unable to stringify error cause.';
    }
  }
}
