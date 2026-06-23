import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsEnum,
  Matches,
  IsString,
  MaxLength,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyJudgmentMode } from '../enums/strategy-judgment-mode.enum';

export class UpdateStrategyDto {
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    example: '1시간 추세 추종 전략',
    description: '전략 이름',
  })
  name!: string;

  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @Matches(/^KRW-[A-Z]+$/, {
    message: 'market은 KRW-BTC 형식이어야 합니다.',
  })
  @ApiPropertyOptional({
    example: 'KRW-BTC',
    description: '코인 종류',
  })
  market!: string;

  @IsString()
  @MaxLength(3000)
  @IsNotEmpty()
  @IsOptional()
  @ApiPropertyOptional({
    example:
      '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
    description: 'AI에게 전달할 프롬프트',
  })
  prompt!: string;

  @IsNotEmpty()
  @IsInt()
  @IsOptional()
  @IsIn([5, 15, 30, 60, 120])
  @ApiPropertyOptional({
    example: 60,
    description: '전략을 주기적으로 실행하는 반복 주기',
  })
  intervalMinutes!: number;

  @IsNotEmpty()
  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    example: '2026-06-02T10:00:00+09:00',
    description: '전략 시작 시간',
  })
  scheduleAnchorAt!: string;

  @IsEnum(StrategyMode)
  @IsOptional()
  @ApiPropertyOptional({
    enum: StrategyMode,
    example: StrategyMode.PAPER,
    description: '전략 모드',
  })
  strategyMode?: StrategyMode;

  @IsEnum(StrategyJudgmentMode)
  @IsOptional()
  @ApiPropertyOptional({
    enum: StrategyJudgmentMode,
    example: StrategyJudgmentMode.USER,
    description: '전략 실행 판단',
  })
  strategyJudgmentMode?: StrategyJudgmentMode;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
    description: '마켓 데이터 조회 허용',
  })
  allowMarketData?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: false,
    description: '뉴스 조회 허용',
  })
  allowNewsSearch?: boolean;
}
