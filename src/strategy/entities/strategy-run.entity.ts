import {
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { UserEntity } from '@/user/entities/user.entity';
import { StrategyEntity } from './strategy.entity';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { StrategyRunResult } from '../types/strategy-run-result.type';
import { StrategyRunGraphSnapshot } from '../types/graph/strategy-run-graph-snapshot.type';

@Index('UQ_strategy_runs_one_running_per_strategy', ['strategyId'], {
  unique: true,
  where: `"status" = 'running'`,
})
@Index('IDX_strategy_runs_strategy_id', ['strategyId'])
@Index('IDX_strategy_runs_user_id', ['userId'])
@Index('IDX_strategy_runs_status', ['status'])
@Index('IDX_strategy_runs_started_at', ['startedAt'])
@Entity({ name: 'strategy_runs' })
export class StrategyRunEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'strategy_id', type: 'int' })
  strategyId!: number;

  @ManyToOne(() => StrategyEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'strategy_id' })
  strategy!: StrategyEntity;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    type: 'enum',
    enum: Object.values(StrategyRunStatus),
    enumName: 'strategy_run_status',
    default: StrategyRunStatus.RUNNING,
  })
  status!: StrategyRunStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  result!: StrategyRunResult | null;

  @Column({ name: 'graph_snapshot', type: 'jsonb', nullable: true })
  graphSnapshot!: StrategyRunGraphSnapshot | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
