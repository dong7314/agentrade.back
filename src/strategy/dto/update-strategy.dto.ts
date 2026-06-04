import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateStrategyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @ApiPropertyOptional({
    example: '1시간 추세 추종 전략',
    description: '전략 이름',
  })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^KRW-[A-Z]+$/, {
    message: 'market은 KRW-BTC 형식이어야 합니다.',
  })
  @ApiPropertyOptional({
    example: 'KRW-BTC',
    description: '코인 종류',
  })
  market?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  @ApiPropertyOptional({
    example:
      '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
    description: 'AI에게 전달할 프롬프트',
  })
  prompt?: string;

  @IsOptional()
  @IsInt()
  @IsIn([5, 15, 30, 60, 120])
  @ApiPropertyOptional({
    example: 60,
    description: '전략을 주기적으로 실행하는 반복 주기',
  })
  intervalMinutes?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    example: '2026-06-02T10:00:00+09:00',
    description: '전략 시작 시간',
  })
  scheduleAnchorAt?: string;
}
