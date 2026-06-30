import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { TradeMarketEntity } from '../entities/trade-market.entity';
import { CreateTradeMarketDto } from '../dto/create-trade-market.dto';
import { UpdateTradeMarketDto } from '../dto/update-trade-market.dto';
import { FindTradeMarketQueryDto } from '../dto/find-trade-market-query.dto';

@Injectable()
export class TradeMarketService {
  constructor(
    @InjectRepository(TradeMarketEntity)
    private readonly tradeMarketRepository: Repository<TradeMarketEntity>,
  ) {}

  async findAll(query: FindTradeMarketQueryDto): Promise<TradeMarketEntity[]> {
    const enabled =
      query.enabled === undefined ? undefined : query.enabled === 'true';

    return this.tradeMarketRepository.find({
      where: {
        ...(query.quote ? { quote: query.quote } : {}),
        ...(enabled === undefined ? {} : { enabled }),
      },
      order: {
        sortOrder: 'ASC',
        market: 'ASC',
      },
    });
  }

  async findEnabledByMarket(market: string): Promise<TradeMarketEntity | null> {
    return this.tradeMarketRepository.findOne({
      where: {
        exchange: 'upbit',
        market,
        enabled: true,
      },
    });
  }

  async create(dto: CreateTradeMarketDto): Promise<TradeMarketEntity> {
    const exchange = dto.exchange ?? 'upbit';

    const existing = await this.tradeMarketRepository.findOne({
      where: {
        exchange,
        market: dto.market,
      },
    });

    if (existing) {
      throw new ConflictException('이미 등록된 마켓입니다.');
    }

    return this.tradeMarketRepository.save(
      this.tradeMarketRepository.create({
        exchange,
        market: dto.market,
        quote: dto.quote,
        symbol: dto.symbol,
        koreanName: dto.koreanName,
        englishName: dto.englishName,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );
  }

  async update(
    id: number,
    dto: UpdateTradeMarketDto,
  ): Promise<TradeMarketEntity> {
    const market = await this.tradeMarketRepository.findOneBy({ id });

    if (!market) {
      throw new NotFoundException('마켓이 존재하지 않습니다.');
    }

    const nextExchange = dto.exchange ?? market.exchange;
    const nextMarket = dto.market ?? market.market;

    // exchange/market 조합은 unique이므로 수정 시 중복을 먼저 확인
    if (nextExchange !== market.exchange || nextMarket !== market.market) {
      const existing = await this.tradeMarketRepository.findOne({
        where: {
          exchange: nextExchange,
          market: nextMarket,
        },
      });

      if (existing && existing.id !== market.id) {
        throw new ConflictException('이미 등록된 마켓입니다.');
      }
    }

    Object.assign(market, {
      ...dto,
      exchange: nextExchange,
      market: nextMarket,
      enabled: dto.enabled ?? market.enabled,
      sortOrder: dto.sortOrder ?? market.sortOrder,
    });

    return this.tradeMarketRepository.save(market);
  }

  async disable(id: number): Promise<void> {
    const market = await this.tradeMarketRepository.findOneBy({ id });

    if (!market) {
      throw new NotFoundException('마켓이 존재하지 않습니다.');
    }

    // 과거 전략/실행 이력과의 연결을 위해 물리 삭제 대신 비활성화
    market.enabled = false;

    await this.tradeMarketRepository.save(market);
  }
}
