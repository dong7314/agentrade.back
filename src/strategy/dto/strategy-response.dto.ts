import { ApiProperty } from '@nestjs/swagger';

import { StrategyEntity } from '../entities/strategy.entity';

import { Exchange } from '../enums/exchange.enum';
import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyStatus } from '../enums/strategy-status.enum';
import { StrategyJudgmentMode } from '../enums/strategy-judgment-mode.enum';

export class StrategyResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({ example: '1시간 추세 추종 전략' })
  name!: string;

  @ApiProperty({ enum: Exchange, example: Exchange.UPBIT })
  exchange!: Exchange;

  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({
    example:
      '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
  })
  prompt!: string;

  @ApiProperty({ enum: StrategyMode, example: StrategyMode.PAPER })
  strategyMode!: StrategyMode;

  @ApiProperty({
    enum: StrategyJudgmentMode,
    example: StrategyJudgmentMode.USER,
  })
  strategyJudgmentMode!: StrategyJudgmentMode;

  @ApiProperty({ example: 60 })
  intervalMinutes!: number;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  scheduleAnchorAt!: Date;

  @ApiProperty({ example: null, nullable: true })
  nextRunAt!: Date | null;

  @ApiProperty({ example: false })
  enabled!: boolean;

  @ApiProperty({ enum: StrategyStatus, example: StrategyStatus.DRAFT })
  strategyStatus!: StrategyStatus;

  @ApiProperty({ example: null, nullable: true })
  structuredStrategy!: Record<string, unknown> | null;

  @ApiProperty({ example: true })
  allowMarketData!: boolean;

  @ApiProperty({ example: false })
  allowNewsSearch!: boolean;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  updatedAt!: Date;

  static fromEntity(strategy: StrategyEntity): StrategyResponseDto {
    return {
      id: strategy.id,
      userId: strategy.userId,
      name: strategy.name,
      exchange: strategy.exchange,
      market: strategy.market,
      prompt: strategy.prompt,
      strategyMode: strategy.strategyMode,
      strategyJudgmentMode: strategy.strategyJudgmentMode,
      intervalMinutes: strategy.intervalMinutes,
      scheduleAnchorAt: strategy.scheduleAnchorAt,
      nextRunAt: strategy.nextRunAt,
      enabled: strategy.enabled,
      strategyStatus: strategy.strategyStatus,
      structuredStrategy: strategy.structuredStrategy,
      allowMarketData: strategy.allowMarketData,
      allowNewsSearch: strategy.allowNewsSearch,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
    };
  }

  static fromEntities(strategies: StrategyEntity[]): StrategyResponseDto[] {
    return strategies.map((strategy) =>
      StrategyResponseDto.fromEntity(strategy),
    );
  }
}
