import {
  Index,
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '@/user/entities/user.entity';
import { PaperAccountEntity } from './paper-account.entity';

@Entity({ name: 'paper_positions' })
@Index('IDX_paper_positions_market', ['market'])
@Index('IDX_paper_positions_user_id', ['userId'])
@Index('UQ_paper_positions_account_market', ['paperAccountId', 'market'], {
  unique: true,
})
export class PaperPositionEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'paper_account_id', type: 'int' })
  paperAccountId!: number;

  @ManyToOne(() => PaperAccountEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'paper_account_id' })
  paperAccount!: PaperAccountEntity;

  @Column({ type: 'varchar', length: 30 })
  market!: string; // KRW-BTC

  @Column({ name: 'quantity', type: 'numeric', precision: 20, scale: 8 })
  quantity!: string;

  @Column({
    name: 'average_entry_price',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  averageEntryPrice!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
