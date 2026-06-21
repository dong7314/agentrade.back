import { ApiProperty } from '@nestjs/swagger';
import { StrategyRunStatus } from '../enums/strategy-run-status.enum';
import { StrategyRunEntity } from '../entities/strategy-run.entity';
import { StrategyRunResult } from '../types/strategy-run-result.type';

export class StrategyRunResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  strategyId!: number;

  @ApiProperty({ example: 1 })
  userId!: number;

  @ApiProperty({
    enum: StrategyRunStatus,
    example: StrategyRunStatus.SUCCEEDED,
  })
  status!: StrategyRunStatus;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  startedAt!: Date;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z', nullable: true })
  finishedAt!: Date | null;

  @ApiProperty({
    example: '현재 오류가 발생하였습니다.',
    nullable: true,
  })
  errorMessage!: string | null;

  @ApiProperty({
    nullable: true,
    example: {
      decision: 'hold',
      reason: 'mock execution only',
      confidence: 0.5,
      steps: [
        {
          name: 'market_data',
          status: 'skipped',
          summary: 'mock 실행에서는 시장 데이터 조회를 생략했습니다.',
        },
        {
          name: 'ai_decision',
          status: 'succeeded',
          summary: 'mock 판단으로 hold를 반환했습니다.',
        },
      ],
      strategy: {
        id: 1,
        market: 'KRW-BTC',
        intervalMinutes: 60,
      },
    },
  })
  result!: StrategyRunResult | null;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-02T01:00:00.000Z' })
  updatedAt!: Date;

  static fromEntity(strategyRun: StrategyRunEntity): StrategyRunResponseDto {
    return {
      id: strategyRun.id,
      strategyId: strategyRun.strategyId,
      userId: strategyRun.userId,
      status: strategyRun.status,
      startedAt: strategyRun.startedAt,
      finishedAt: strategyRun.finishedAt,
      errorMessage: strategyRun.errorMessage,
      result: strategyRun.result,
      createdAt: strategyRun.createdAt,
      updatedAt: strategyRun.updatedAt,
    };
  }

  static fromEntities(
    strategyRun: StrategyRunEntity[],
  ): StrategyRunResponseDto[] {
    return strategyRun.map((strategy) =>
      StrategyRunResponseDto.fromEntity(strategy),
    );
  }
}
