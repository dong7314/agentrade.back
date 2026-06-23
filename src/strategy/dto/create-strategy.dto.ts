import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @ApiProperty({
    example: '1시간 추세 추종 전략',
    description: '전략 이름',
  })
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^KRW-[A-Z]+$/, {
    message: 'market은 KRW-BTC 형식이어야 합니다.',
  })
  @ApiProperty({
    example: 'KRW-BTC',
    description: '코인 종류',
  })
  market!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  @ApiProperty({
    example:
      '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
    description: 'AI에게 전달할 프롬프트',
  })
  prompt!: string;

  @IsInt()
  @IsIn([5, 15, 30, 60, 120])
  @ApiProperty({
    example: 60,
    description: '전략을 주기적으로 실행하는 반복 주기',
  })
  intervalMinutes!: number;

  @IsEnum(StrategyMode)
  @IsOptional()
  @ApiPropertyOptional({
    enum: StrategyMode,
    example: StrategyMode.PAPER,
    description: '전략 실행 모드입니다. 생략하면 paper로 생성됩니다.',
  })
  strategyMode?: StrategyMode;

  @IsEnum(StrategyJudgmentMode)
  @IsOptional()
  @ApiPropertyOptional({
    enum: StrategyJudgmentMode,
    example: StrategyJudgmentMode.USER,
    description: '전략 실행 판단 설정입니다. 생략하면 user로 설정됩니다.',
  })
  strategyJudgmentMode?: StrategyJudgmentMode;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
    description: '마켓 데이터 조회 허용 여부입니다. 생략하면 true입니다.',
  })
  allowMarketData?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: false,
    description: '뉴스 검색 허용 여부입니다. 생략하면 false입니다.',
  })
  allowNewsSearch?: boolean;

  @IsDateString()
  @ApiProperty({
    example: '2026-06-02T10:00:00+09:00',
    description: '전략 시작 시간',
  })
  scheduleAnchorAt!: string;
}
