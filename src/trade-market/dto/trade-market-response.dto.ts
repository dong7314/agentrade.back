import { ApiProperty } from '@nestjs/swagger';

import { TradeMarketEntity } from '../entities/trade-market.entity';

export class TradeMarketResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'upbit' })
  exchange!: string;

  @ApiProperty({ example: 'KRW-BTC' })
  market!: string;

  @ApiProperty({ example: 'KRW' })
  quote!: string;

  @ApiProperty({ example: 'BTC' })
  symbol!: string;

  @ApiProperty({ example: '비트코인' })
  koreanName!: string;

  @ApiProperty({ example: 'Bitcoin' })
  englishName!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 1 })
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: TradeMarketEntity): TradeMarketResponseDto {
    return {
      id: entity.id,
      exchange: entity.exchange,
      market: entity.market,
      quote: entity.quote,
      symbol: entity.symbol,
      koreanName: entity.koreanName,
      englishName: entity.englishName,
      enabled: entity.enabled,
      sortOrder: entity.sortOrder,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: TradeMarketEntity[]): TradeMarketResponseDto[] {
    return entities.map((entity) => TradeMarketResponseDto.fromEntity(entity));
  }
}
