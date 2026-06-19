export class LlmChatCompletionResponseDto {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}
