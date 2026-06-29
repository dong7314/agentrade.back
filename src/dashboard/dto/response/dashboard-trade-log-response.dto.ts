import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { StrategyOrderApprovalEntity } from '@/strategy/entities/strategy-order-approval.entity';

import { StrategyMode } from '@/strategy/enums/strategy-mode.enum';
import { StrategyOrderApprovalStatus } from '@/strategy/enums/strategy-order-approval-status.enum';

export class DashboardTradeLogItemDto {
  @ApiProperty({ example: 'approval-12' })
  id!: string;

  @ApiProperty({ example: 'approval' })
  source!: 'approval';

  @ApiProperty({ example: 3 })
  strategyId!: number;

  @ApiProperty({ example: 40 })
  strategyRunId!: number;

  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ enum: StrategyMode, example: StrategyMode.PAPER })
  mode!: StrategyMode;

  @ApiProperty({ example: 'buy' })
  decision!: 'buy' | 'sell';

  @ApiProperty({ example: 'market' })
  orderType!: 'market' | 'limit';

  @ApiProperty({
    enum: StrategyOrderApprovalStatus,
    example: StrategyOrderApprovalStatus.EXECUTED,
  })
  status!: StrategyOrderApprovalStatus;

  @ApiPropertyOptional({ example: 50000, nullable: true })
  amountKrw!: number | null;

  @ApiPropertyOptional({ example: 0.0005, nullable: true })
  volume!: number | null;

  @ApiPropertyOptional({ example: 100000000, nullable: true })
  priceKrw!: number | null;

  @ApiPropertyOptional({ example: 'paper 매수 주문을 반영했습니다.' })
  reason!: string | null;

  @ApiPropertyOptional({ enum: ['wait', 'done', 'cancel'], nullable: true })
  liveOrderState!: 'wait' | 'done' | 'cancel' | null;

  @ApiPropertyOptional({ example: 0.001, nullable: true })
  executedVolume!: number | null;

  @ApiPropertyOptional({ example: 0, nullable: true })
  remainingVolume!: number | null;

  @ApiPropertyOptional({ example: 47.5, nullable: true })
  paidFee!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  decidedAt!: Date | null;

  static fromApproval(
    approval: StrategyOrderApprovalEntity,
  ): DashboardTradeLogItemDto {
    const orderResult = approval.orderResult;

    return {
      id: `approval-${approval.id}`,
      source: 'approval',
      strategyId: approval.strategyId,
      strategyRunId: approval.strategyRunId,
      market: approval.market,
      mode: approval.strategyMode,
      decision: approval.decision,
      orderType: approval.orderType,
      status: approval.status,
      amountKrw:
        orderResult?.amountKrw ??
        approval.adjustedOrder.estimatedOrderAmountKrw,
      volume: orderResult?.volume ?? approval.adjustedOrder.estimatedVolume,
      priceKrw: orderResult?.priceKrw ?? approval.adjustedOrder.priceKrw,
      reason: orderResult?.reason ?? approval.decisionReason,
      liveOrderState: orderResult?.liveOrderState ?? null,
      executedVolume: orderResult?.executedVolume ?? null,
      remainingVolume: orderResult?.remainingVolume ?? null,
      paidFee: orderResult?.paidFee ?? null,
      createdAt: approval.createdAt,
      decidedAt: approval.decidedAt,
    };
  }

  static fromApprovals(
    approvals: StrategyOrderApprovalEntity[],
  ): DashboardTradeLogItemDto[] {
    return approvals.map((approval) => this.fromApproval(approval));
  }
}

export class DashboardTradeLogsResponseDto {
  @ApiProperty({ type: [DashboardTradeLogItemDto] })
  items!: DashboardTradeLogItemDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  })
  meta!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
