import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { plainToInstance } from 'class-transformer';

import { UserRole } from '@/common/enums/user-role.enum';
import { UserEntity } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 1 })
  @Expose()
  id!: number;

  @ApiProperty({ example: 'kim.investor@example.com' })
  @Expose()
  email!: string;

  @ApiProperty({ example: '김투자' })
  @Expose()
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  @Expose()
  role!: UserRole;

  static fromEntity(user: UserEntity): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}
