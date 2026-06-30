import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { UserRole } from '@/common/enums/user-role.enum';

export class UpdateUserPermissionsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  paperTradingEnabled?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  liveTradingEnabled?: boolean;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
