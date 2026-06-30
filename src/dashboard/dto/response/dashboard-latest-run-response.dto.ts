import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { StrategyOrderApprovalStatus } from '@/strategy/enums/strategy-order-approval-status.enum';

export class DashboardLatestRunStepDto {
  @ApiProperty({ example: 'ai_decision' })
  name!: string;

  @ApiProperty({ example: 'succeeded' })
  status!: string;

  @ApiProperty({ example: 'AI 판단을 완료했습니다.' })
  summary!: string;

  @ApiPropertyOptional()
  output?: unknown;
}

export class DashboardLatestRunResponseDto {
  @ApiProperty({ example: 12 })
  runId!: number;

  @ApiProperty({ example: 3 })
  strategyId!: number;

  @ApiProperty({ example: 'succeeded' })
  status!: string;

  @ApiProperty({ example: 'buy', nullable: true })
  decision!: string | null;

  @ApiProperty({ example: 0.82, nullable: true })
  confidence!: number | null;

  @ApiProperty({
    example: '시장 데이터와 포트폴리오를 기준으로 매수 판단했습니다.',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({ type: [DashboardLatestRunStepDto] })
  steps!: DashboardLatestRunStepDto[];

  @ApiProperty({ example: 'ai_decision', nullable: true })
  currentStepName!: string | null;

  @ApiProperty({ example: 5, nullable: true })
  approvalId!: number | null;

  @ApiProperty({
    enum: StrategyOrderApprovalStatus,
    example: StrategyOrderApprovalStatus.PENDING,
    nullable: true,
  })
  approvalStatus!: string | null;

  @ApiProperty()
  startedAt!: Date;

  @ApiProperty({ nullable: true })
  finishedAt!: Date | null;
}
