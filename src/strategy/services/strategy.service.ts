import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { UserService } from '@/user/services/user.service';
import { StrategyParseService } from './strategy-parse.service';

import { calculateNextRunAt } from '../utils/calculate-next-run-at';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { StrategyStatus } from '../enums/strategy-status.enum';
import { StrategyEntity } from '../entities/strategy.entity';
import { PaginatedResult } from '@/common/types/paginated.type';
import { StrategyJudgmentMode } from '../enums/strategy-judgment-mode.enum';
import { createPaginationMeta } from '@/common/utils/create-pagination-meta';
import { FindStrategiesQueryDto } from '../dto/find-strategy.query.dto';

@Injectable()
export class StrategyService {
  constructor(
    @InjectRepository(StrategyEntity)
    private readonly strategyRepository: Repository<StrategyEntity>,
    private readonly userService: UserService,
    private readonly strategyParseService: StrategyParseService,
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

  // 사용자 및 아이디를 통해 특정 전략을 찾는 메서드
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
    strategyMode?: StrategyMode;
    intervalMinutes: number;
    scheduleAnchorAt: string;
    allowMarketData?: boolean;
    allowNewsSearch?: boolean;
    strategyJudgmentMode?: StrategyJudgmentMode;
  }): Promise<StrategyEntity> {
    const user = await this.userService.findById(input.userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const strategyMode = input.strategyMode ?? StrategyMode.PAPER;
    const strategyJudgmentMode =
      input.strategyJudgmentMode ?? StrategyJudgmentMode.USER;

    if (strategyMode === StrategyMode.LIVE && !user.liveTradingEnabled) {
      throw new BadRequestException('실거래 권한이 없는 사용자입니다.');
    }

    const strategy = this.strategyRepository.create({
      user,
      name: input.name,
      market: input.market,
      prompt: input.prompt,
      strategyMode,
      intervalMinutes: input.intervalMinutes,
      scheduleAnchorAt: new Date(input.scheduleAnchorAt),
      allowMarketData: input.allowMarketData ?? true,
      allowNewsSearch: input.allowNewsSearch ?? false,
      strategyJudgmentMode,
    });

    return this.strategyRepository.save(strategy);
  }

  // 전략 업데이트
  async update(input: {
    userId: number;
    strategyId: number;
    name?: string;
    market?: string;
    prompt?: string;
    strategyMode?: StrategyMode;
    intervalMinutes?: number;
    scheduleAnchorAt?: string;
    allowMarketData?: boolean;
    allowNewsSearch?: boolean;
    strategyJudgmentMode?: StrategyJudgmentMode;
  }): Promise<StrategyEntity> {
    const user = await this.userService.findById(input.userId);
    const strategy = await this.findOneByUser(input.strategyId, input.userId);

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (strategy.strategyStatus === StrategyStatus.ARCHIVED) {
      throw new BadRequestException('보관된 전략은 수정할 수 없습니다.');
    }

    if (strategy.enabled || strategy.strategyStatus === StrategyStatus.ACTIVE) {
      throw new BadRequestException(
        '활성화된 전략은 일시정지 후 수정할 수 있습니다.',
      );
    }

    if (input.strategyMode === StrategyMode.LIVE && !user.liveTradingEnabled) {
      throw new BadRequestException('실거래 권한이 없는 사용자입니다.');
    }

    strategy.name = input.name ?? strategy.name;
    strategy.market = input.market ?? strategy.market;
    strategy.prompt = input.prompt ?? strategy.prompt;
    strategy.strategyMode = input.strategyMode ?? strategy.strategyMode;
    strategy.intervalMinutes =
      input.intervalMinutes ?? strategy.intervalMinutes;
    strategy.scheduleAnchorAt = input.scheduleAnchorAt
      ? new Date(input.scheduleAnchorAt)
      : strategy.scheduleAnchorAt;
    strategy.allowMarketData =
      input.allowMarketData ?? strategy.allowMarketData;
    strategy.allowNewsSearch =
      input.allowNewsSearch ?? strategy.allowNewsSearch;
    strategy.strategyJudgmentMode =
      input.strategyJudgmentMode ?? strategy.strategyJudgmentMode;

    // strategy 내용 업데이트 시 parse 초기화
    strategy.structuredStrategy = null;
    strategy.nextRunAt = null;

    return this.strategyRepository.save(strategy);
  }

  // 전략 상태 업데이트 진행
  async updateStatus(input: {
    userId: number;
    strategyId: number;
    strategyStatus: StrategyStatus;
  }): Promise<StrategyEntity> {
    const strategy = await this.findOneByUser(input.strategyId, input.userId);

    if (strategy.strategyStatus === input.strategyStatus) {
      return strategy;
    }

    if (strategy.strategyStatus === StrategyStatus.ARCHIVED) {
      throw new BadRequestException('보관된 전략은 상태를 변경할 수 없습니다.');
    }

    switch (input.strategyStatus) {
      case StrategyStatus.ACTIVE:
        this.activateStrategy(strategy);
        break;

      case StrategyStatus.PAUSED:
        this.pauseStrategy(strategy);
        break;

      case StrategyStatus.ARCHIVED:
        this.archiveStrategy(strategy);
        break;

      case StrategyStatus.DRAFT:
        throw new BadRequestException(
          '전략은 draft 상태로 되돌릴 수 없습니다.',
        );
    }

    return this.strategyRepository.save(strategy);
  }

  // parse 저장 로직
  async parse(input: {
    userId: number;
    strategyId: number;
  }): Promise<StrategyEntity> {
    const strategy = await this.findOneByUser(input.strategyId, input.userId);

    if (strategy.strategyStatus === StrategyStatus.ARCHIVED) {
      throw new BadRequestException('보관된 전략은 구조화할 수 없습니다.');
    }

    if (strategy.enabled || strategy.strategyStatus === StrategyStatus.ACTIVE) {
      throw new BadRequestException(
        '활성화된 전략은 일시정지 후 구조화할 수 있습니다.',
      );
    }

    strategy.structuredStrategy =
      await this.strategyParseService.parseStrategy(strategy);

    return this.strategyRepository.save(strategy);
  }

  async remove(input: { userId: number; strategyId: number }): Promise<void> {
    const strategy = await this.findOneByUser(input.strategyId, input.userId);

    if (strategy.strategyStatus === StrategyStatus.ACTIVE || strategy.enabled) {
      throw new BadRequestException(
        '활성화된 전략은 일시정지 후 삭제할 수 있습니다.',
      );
    }

    strategy.strategyStatus = StrategyStatus.ARCHIVED;
    strategy.enabled = false;
    strategy.nextRunAt = null;

    await this.strategyRepository.softRemove(strategy);
  }

  // active 상태로 전략 상태 변경
  private activateStrategy(strategy: StrategyEntity): void {
    if (!isStructuredStrategy(strategy.structuredStrategy)) {
      throw new BadRequestException(
        '구조화되지 않은 전략은 활성화할 수 없습니다.',
      );
    }

    strategy.strategyStatus = StrategyStatus.ACTIVE;
    strategy.enabled = true;
    strategy.nextRunAt = calculateNextRunAt(
      strategy.scheduleAnchorAt,
      strategy.intervalMinutes,
    );
  }

  // pause 상태로 전략 상태 변경
  private pauseStrategy(strategy: StrategyEntity): void {
    if (strategy.strategyStatus === StrategyStatus.DRAFT) {
      throw new BadRequestException('초안 전략은 일시정지할 수 없습니다.');
    }

    strategy.strategyStatus = StrategyStatus.PAUSED;
    strategy.enabled = false;
    strategy.nextRunAt = null;
  }

  // archive 상태로 전략 변경
  private archiveStrategy(strategy: StrategyEntity): void {
    if (strategy.strategyStatus === StrategyStatus.ACTIVE) {
      throw new BadRequestException(
        '활성화된 전략은 일시정지 후 보관할 수 있습니다.',
      );
    }

    strategy.strategyStatus = StrategyStatus.ARCHIVED;
    strategy.enabled = false;
    strategy.nextRunAt = null;
  }
}
