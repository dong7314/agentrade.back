import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectStrategyOrderApprovalDto {
  @ApiPropertyOptional({
    example: '변동성이 너무 높아서 이번 주문은 보류합니다.',
    description: '사용자가 주문 후보를 거절하는 이유입니다.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
