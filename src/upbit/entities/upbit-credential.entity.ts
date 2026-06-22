import { UserEntity } from '@/user/entities/user.entity';
import {
  Index,
  Column,
  Entity,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Index('UQ_upbit_credential_user_id', ['userId'], { unique: true })
@Entity({ name: 'upbit_credential' })
export class UpbitCredentialEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'encrypted_access_key', type: 'text' })
  encryptedAccessKey!: string;

  @Column({ name: 'encrypted_secret_key', type: 'text' })
  encryptedSecretKey!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
