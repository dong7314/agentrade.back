import { Transform } from 'class-transformer';
import {
  IsEnum,
  Matches,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyStatus } from '../enums/strategy-status.enum';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export class FindStrategiesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^KRW-[A-Z]+$/)
  market?: string;

  @IsOptional()
  @IsEnum(StrategyStatus)
  strategyStatus?: StrategyStatus;

  @IsOptional()
  @IsEnum(StrategyMode)
  strategyMode?: StrategyMode;

  @IsOptional()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  enabled?: boolean;
}
