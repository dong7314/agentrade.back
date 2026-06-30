import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Max,
  Min,
  IsInt,
  IsEnum,
  Matches,
  IsDateString,
  IsOptional,
} from 'class-validator';

import { StrategyMode } from '@/strategy/enums/strategy-mode.enum';
import { StrategyOrderApprovalStatus } from '@/strategy/enums/strategy-order-approval-status.enum';

export class DashboardTradeLogsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  @ApiPropertyOptional({ example: 20 })
  limit?: number = 20;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiPropertyOptional({ example: 3 })
  strategyId?: number;

  @IsOptional()
  @Matches(/^KRW-[A-Z0-9]+$/)
  @ApiPropertyOptional({ example: 'KRW-BTC' })
  market?: string;

  @IsOptional()
  @IsEnum(StrategyMode)
  @ApiPropertyOptional({ enum: StrategyMode, example: StrategyMode.PAPER })
  mode?: StrategyMode;

  @IsOptional()
  @IsEnum(StrategyOrderApprovalStatus)
  @ApiPropertyOptional({
    enum: StrategyOrderApprovalStatus,
    example: StrategyOrderApprovalStatus.EXECUTED,
  })
  status?: StrategyOrderApprovalStatus;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-06-30T23:59:59.999Z' })
  dateTo?: string;
}
