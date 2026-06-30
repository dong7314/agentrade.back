import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Min,
  IsInt,
  Matches,
  IsString,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateTradeMarketDto {
  @ApiPropertyOptional({ example: 'upbit' })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiProperty({ example: 'KRW-BTC' })
  @Matches(/^[A-Z]{2,10}-[A-Z0-9]{2,20}$/)
  market!: string;

  @ApiProperty({ example: 'KRW' })
  @Matches(/^[A-Z]{2,10}$/)
  quote!: string;

  @ApiProperty({ example: 'BTC' })
  @Matches(/^[A-Z0-9]{2,20}$/)
  symbol!: string;

  @ApiProperty({ example: '비트코인' })
  @IsString()
  koreanName!: string;

  @ApiProperty({ example: 'Bitcoin' })
  @IsString()
  englishName!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
