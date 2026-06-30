import { IsBooleanString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindTradeMarketQueryDto {
  @ApiPropertyOptional({ example: 'KRW' })
  @IsOptional()
  @Matches(/^[A-Z]{2,10}$/)
  quote?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  enabled?: string;
}
