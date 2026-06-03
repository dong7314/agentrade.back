import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';

import { UserService } from '@/user/services/user.service';

import { StrategyEntity } from '../entities/strategy.entity';
import { PaginatedResult } from '@/common/types/paginated.type';
import { createPaginationMeta } from '@/common/utils/create-pagination-meta';
import { FindStrategiesQueryDto } from '../dto/find-strategy.query.dto';

@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    private readonly userService: UserService,
  ) {}

  // 사용자의 전략을 전부 찾는 메서드
  async findAllByUser(
    userId: number,
    query: FindStrategiesQueryDto,
  ): Promise<PaginatedResult<StrategyEntity>> {
    const { page, limit } = query;

    const where = {
      userId,
      ...(query.market ? { market: query.market } : {}),
      ...(query.strategyStatus ? { strategyStatus: query.strategyStatus } : {}),
      ...(query.strategyMode ? { strategyMode: query.strategyMode } : {}),
      ...(query.enabled !== undefined ? { enabled: query.enabled } : {}),
    };

    const [items, total] = await this.strategyRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: createPaginationMeta({ page, limit, total }),
    };
  }

  // 특정 전략을 찾는 메서드
  async findOneByUser(id: number, userId: number): Promise<StrategyEntity> {
    const strategy = await this.strategyRepository.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!strategy) {
      throw new NotFoundException('전략이 존재하지 않습니다.');
    }

    return strategy;
  }

  // 전략 생성
  async create(input: {
    userId: number;
    name: string;
    market: string;
    prompt: string;
    intervalMinutes: number;
    scheduleAnchorAt: string;
  }): Promise<StrategyEntity> {
    const user = await this.userService.findById(input.userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const strategy = this.strategyRepository.create({
      user,
      name: input.name,
      market: input.market,
      prompt: input.prompt,
      intervalMinutes: input.intervalMinutes,
      scheduleAnchorAt: new Date(input.scheduleAnchorAt),
    });

    return this.strategyRepository.save(strategy);
  }
}
