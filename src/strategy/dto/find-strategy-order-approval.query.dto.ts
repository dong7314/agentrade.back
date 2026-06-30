import { Type } from 'class-transformer';
import {
  Min,
  IsInt,
  IsEnum,
  Matches,
  IsOptional,
  IsDateString,
} from 'class-validator';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

export class FindStrategyOrderApprovalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(StrategyOrderApprovalStatus)
  status?: StrategyOrderApprovalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  strategyId?: number;

  @IsOptional()
  @Matches(/^KRW-[A-Z0-9]+$/)
  market?: string;

  @IsOptional()
  @IsEnum(StrategyMode)
  mode?: StrategyMode;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
