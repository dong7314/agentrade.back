import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { StrategyStatus } from '../enums/strategy-status.enum';

export class UpdateStrategyStatusDto {
  @IsEnum(StrategyStatus)
  @ApiProperty({
    enum: StrategyStatus,
    example: StrategyStatus.ACTIVE,
    description: '변경할 전략 상태',
  })
  strategyStatus!: StrategyStatus;
}
