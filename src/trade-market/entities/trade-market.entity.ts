import {
  Index,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'trade_markets' })
@Index('UQ_trade_market_exchange_market', ['exchange', 'market'], {
  unique: true,
})
export class TradeMarketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 30, default: 'upbit' })
  exchange!: string;

  @Column({ type: 'varchar', length: 30 })
  market!: string; // KRW-BTC

  @Column({ type: 'varchar', length: 10 })
  quote!: string; // KRW

  @Column({ type: 'varchar', length: 20 })
  symbol!: string; // BTC

  @Column({ name: 'korean_name', type: 'varchar', length: 50 })
  koreanName!: string;

  @Column({ name: 'english_name', type: 'varchar', length: 80 })
  englishName!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
