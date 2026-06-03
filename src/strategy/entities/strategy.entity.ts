import {
  Index,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '@/user/entities/user.entity';

import { Exchange } from '../enums/exchange.enum';
import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyStatus } from '../enums/strategy-status.enum';

@Index('IDX_strategies_user_id', ['userId'])
@Index('IDX_strategies_next_run_at', ['nextRunAt'])
@Entity({ name: 'strategies' })
export class StrategyEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({
    type: 'enum',
    enum: Object.values(Exchange),
    enumName: 'exchange',
    default: Exchange.UPBIT,
  })
  exchange!: Exchange;

  @Column({ type: 'varchar', length: 30 })
  market!: string; // KRW-BTC

  @Column({ type: 'text' })
  prompt!: string;

  @Column({
    name: 'strategy_mode',
    type: 'enum',
    enum: Object.values(StrategyMode),
    enumName: 'strategy_mode',
    default: StrategyMode.PAPER,
  })
  strategyMode!: StrategyMode;

  @Column({ name: 'interval_minutes', type: 'int' })
  intervalMinutes!: number;

  @Column({ name: 'schedule_anchor_at', type: 'timestamptz' })
  scheduleAnchorAt!: Date;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({
    name: 'strategy_status',
    type: 'enum',
    enum: Object.values(StrategyStatus),
    enumName: 'strategy_status',
    default: StrategyStatus.DRAFT,
  })
  strategyStatus!: StrategyStatus;

  @Column({ name: 'structured_strategy', type: 'jsonb', nullable: true })
  structuredStrategy!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
