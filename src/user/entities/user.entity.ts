import {
  Index,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserRole } from '@/common/enums/user-role.enum';
import { AuthProvider } from '@/common/enums/auth-provider.enum';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index('UQ_user_email', ['email'], { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password!: string | null;

  @Column({ length: 50 })
  name!: string;

  @Column({
    type: 'enum',
    enum: Object.values(UserRole),
    enumName: 'user_role',
    default: UserRole.USER,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: Object.values(AuthProvider),
    enumName: 'auth_provider',
    default: AuthProvider.LOCAL,
  })
  provider!: AuthProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, nullable: true })
  providerId!: string | null;

  @Column({ name: 'paper_trading_enabled', default: true })
  paperTradingEnabled!: boolean;

  @Column({ name: 'live_trading_enabled', default: false })
  liveTradingEnabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date;
}
