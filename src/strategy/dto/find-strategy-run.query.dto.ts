import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

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
}
