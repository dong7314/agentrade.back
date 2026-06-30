import { Type } from 'class-transformer';
import {
  Min,
  IsInt,
  IsEnum,
  Matches,
  IsDateString,
  IsOptional,
} from 'class-validator';

import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class FindStrategyRunsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  strategyId?: number;

  @IsOptional()
  @IsEnum(StrategyRunStatus)
  status?: StrategyRunStatus;

  @IsOptional()
  @Matches(/^KRW-[A-Z0-9]+$/)
  market?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
