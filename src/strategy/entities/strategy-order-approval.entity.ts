import { UserEntity } from '@/user/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { StrategyEntity } from './strategy.entity';
import { StrategyRunEntity } from './strategy-run.entity';

import type {
  RiskCheckResult,
  RiskAdjustedOrder,
} from '../types/risk-check-result.type';
import type { TradeOrderResult } from '../types/trade-order-result.type';
import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

@Index('IDX_strategy_order_approvals_user_id', ['userId'])
@Index('IDX_strategy_order_approvals_status', ['status'])
@Index('UQ_strategy_order_approvals_run_id', ['strategyRunId'], {
  unique: true,
})
@Entity({ name: 'strategy_order_approvals' })
export class StrategyOrderApprovalEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'strategy_id', type: 'int' })
  strategyId!: number;

  @ManyToOne(() => StrategyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategy_id' })
  strategy!: StrategyEntity;

  @Column({ name: 'strategy_run_id', type: 'int' })
  strategyRunId!: number;

  @ManyToOne(() => StrategyRunEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategy_run_id' })
  strategyRun!: StrategyRunEntity;

  @Column({
    name: 'strategy_mode',
    type: 'enum',
    enum: Object.values(StrategyMode),
    enumName: 'strategy_mode',
  })
  strategyMode!: StrategyMode;

  @Column({ type: 'varchar', length: 30 })
  market!: string;

  @Column({ type: 'varchar', length: 10 })
  decision!: 'buy' | 'sell';

  @Column({ name: 'order_type', type: 'varchar', length: 10 })
  orderType!: 'market' | 'limit';

  @Column({ name: 'decision_reason', type: 'text' })
  decisionReason!: string;

  @Column({ name: 'adjusted_order', type: 'jsonb' })
  adjustedOrder!: RiskAdjustedOrder;

  @Column({ name: 'risk_check_result', type: 'jsonb' })
  riskCheckResult!: RiskCheckResult;

  @Column({ name: 'order_result', type: 'jsonb', nullable: true })
  orderResult!: TradeOrderResult | null;

  @Column({
    type: 'enum',
    enum: Object.values(StrategyOrderApprovalStatus),
    enumName: 'strategy_order_approval_status',
    default: StrategyOrderApprovalStatus.PENDING,
  })
  status!: StrategyOrderApprovalStatus;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
