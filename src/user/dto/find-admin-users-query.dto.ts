import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';

import { UserRole } from '@/common/enums/user-role.enum';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class FindAdminUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBooleanString()
  paperTradingEnabled?: string;

  @IsOptional()
  @IsBooleanString()
  liveTradingEnabled?: string;
}
