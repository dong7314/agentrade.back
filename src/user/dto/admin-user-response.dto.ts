import { ApiProperty } from '@nestjs/swagger';

import { UserEntity } from '../entities/user.entity';

import { UserRole } from '@/common/enums/user-role.enum';
import { AuthProvider } from '@/common/enums/auth-provider.enum';

export class AdminUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'kim@example.com' })
  email!: string;

  @ApiProperty({ example: '김투자' })
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @ApiProperty({ example: true })
  paperTradingEnabled!: boolean;

  @ApiProperty({ example: false })
  liveTradingEnabled!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(user: UserEntity): AdminUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
      paperTradingEnabled: user.paperTradingEnabled,
      liveTradingEnabled: user.liveTradingEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static fromEntities(users: UserEntity[]): AdminUserResponseDto[] {
    return users.map((user) => AdminUserResponseDto.fromEntity(user));
  }
}
