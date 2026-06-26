import { ApiProperty } from '@nestjs/swagger';

import { StrategyMode } from '../enums/strategy-mode.enum';
import type { RiskCheckResult } from '../types/risk-check-result.type';
import type { TradeOrderResult } from '../types/trade-order-result.type';
import type { StrategyOrderApprovalEntity } from '../entities/strategy-order-approval.entity';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

export class StrategyOrderApprovalResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: 3 })
  strategyId!: number;

  @ApiProperty({ example: 15 })
  strategyRunId!: number;

  @ApiProperty({ enum: StrategyMode, example: StrategyMode.PAPER })
  strategyMode!: StrategyMode;

  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ enum: ['buy', 'sell'], example: 'buy' })
  decision!: 'buy' | 'sell';

  @ApiProperty({ enum: ['market', 'limit'], example: 'market' })
  orderType!: 'market' | 'limit';

  @ApiProperty({
    example:
      '단기 추세와 거래량 흐름이 우호적이지만 변동성이 높아 제한된 비중으로 접근합니다.',
  })
  decisionReason!: string;

  @ApiProperty({
    nullable: true,
    example: {
      decision: 'buy',
      sizeFraction: 0.1,
      orderType: 'market',
      limitPrice: null,
      priceKrw: 95000000,
      estimatedVolume: 0.001,
      estimatedOrderAmountKrw: 95000,
    },
  })
  adjustedOrder!: StrategyOrderApprovalEntity['adjustedOrder'];

  @ApiProperty({
    nullable: true,
    example: {
      passed: true,
      retryable: false,
      reason: 'Risk check를 통과했습니다.',
      violations: [],
      adjustedOrder: {
        decision: 'buy',
        sizeFraction: 0.1,
        orderType: 'market',
        limitPrice: null,
        priceKrw: 95000000,
        estimatedVolume: 0.001,
        estimatedOrderAmountKrw: 95000,
      },
    },
  })
  riskCheckResult!: RiskCheckResult | null;

  @ApiProperty({
    nullable: true,
    example: {
      mode: 'paper',
      market: 'KRW-BTC',
      decision: 'buy',
      orderType: 'market',
      amountKrw: 95000,
      volume: 0.001,
      priceKrw: 95000000,
      status: 'created',
      externalOrderId: null,
      reason: 'paper 매수 주문을 반영했습니다.',
    },
  })
  orderResult!: TradeOrderResult | null;

  @ApiProperty({
    enum: StrategyOrderApprovalStatus,
    example: StrategyOrderApprovalStatus.PENDING,
  })
  status!: StrategyOrderApprovalStatus;

  @ApiProperty({
    example: '위험도가 높아 사용자가 거절했습니다.',
    nullable: true,
  })
  rejectReason!: string | null;

  @ApiProperty({ example: '2026-06-26T01:00:00.000Z', nullable: true })
  decidedAt!: Date | null;

  @ApiProperty({ example: '2026-06-26T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-26T01:00:00.000Z' })
  updatedAt!: Date;

  static fromEntity(
    approval: StrategyOrderApprovalEntity,
  ): StrategyOrderApprovalResponseDto {
    return {
      id: approval.id,
      userId: approval.userId,
      strategyId: approval.strategyId,
      strategyRunId: approval.strategyRunId,
      strategyMode: approval.strategyMode,
      market: approval.market,
      decision: approval.decision,
      orderType: approval.orderType,
      decisionReason: approval.decisionReason,
      adjustedOrder: approval.adjustedOrder,
      riskCheckResult: approval.riskCheckResult,
      orderResult: approval.orderResult,
      status: approval.status,
      rejectReason: approval.rejectReason,
      decidedAt: approval.decidedAt,
      createdAt: approval.createdAt,
      updatedAt: approval.updatedAt,
    };
  }

  static fromEntities(
    approvals: StrategyOrderApprovalEntity[],
  ): StrategyOrderApprovalResponseDto[] {
    return approvals.map((approval) =>
      StrategyOrderApprovalResponseDto.fromEntity(approval),
    );
  }
}
