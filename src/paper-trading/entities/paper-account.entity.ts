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

import { UserEntity } from '@/user/entities/user.entity';

@Entity({ name: 'paper_accounts' })
@Index('UQ_paper_account_user_id', ['userId'], { unique: true })
export class PaperAccountEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({
    name: 'base_currency',
    type: 'varchar',
    length: 10,
    default: 'KRW',
  })
  baseCurrency!: string;

  @Column({ name: 'cash_balance', type: 'numeric', precision: 20, scale: 8 })
  cashBalance!: string;

  @Column({
    name: 'initial_cash_balance',
    type: 'numeric',
    precision: 20,
    scale: 8,
  })
  initialCashBalance!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
