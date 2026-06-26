import { IsEnum, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

export class FindStrategyOrderApprovalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StrategyOrderApprovalStatus)
  status?: StrategyOrderApprovalStatus;
}
