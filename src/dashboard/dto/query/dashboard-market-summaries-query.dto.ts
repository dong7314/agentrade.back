import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DashboardMarketSummariesQueryDto {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: 'KRW-BTC,KRW-ETH,KRW-XRP',
    description:
      '조회할 마켓 목록입니다. 쉼표로 구분합니다. 생략하면 기본 주요 마켓을 조회합니다.',
  })
  markets?: string;
}
