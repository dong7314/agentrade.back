import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Min,
  Max,
  IsIn,
  IsInt,
  Matches,
  IsString,
  IsOptional,
} from 'class-validator';

export class DashboardChartQueryDto {
  @IsString()
  @Matches(/^KRW-[A-Z]+$/, {
    message: 'market은 KRW-BTC 형식이어야 합니다.',
  })
  @ApiProperty({
    example: 'KRW-BTC',
    description: '차트 데이터를 조회할 Upbit 마켓입니다.',
  })
  market!: string;

  @IsIn(['1m', '3m', '5m', '10m', '15m', '30m', '1h', '4h'])
  @ApiProperty({
    example: '5m',
    description: '조회할 차트 timeframe입니다.',
  })
  timeframe!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @ApiPropertyOptional({
    example: 50,
    description: '조회할 캔들 개수입니다. 생략하면 50개를 조회합니다.',
  })
  count?: number;
}
