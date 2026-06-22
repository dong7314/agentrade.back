import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { PaperAccountEntity } from '../entities/paper-account.entity';

import { PaperPortfolio } from '../types/paper-portfolio.type';
import { PaperPositionEntity } from '../entities/paper-position.entity';

@Injectable()
export class PaperPortfolioService {
  constructor(
    @InjectRepository(PaperAccountEntity)
    private readonly paperAccountRepository: Repository<PaperAccountEntity>,
    @InjectRepository(PaperPositionEntity)
    private readonly paperPositionRepository: Repository<PaperPositionEntity>,
  ) {}

  // 사용자 가상 포트폴리오 조회
  async getPortfolio(input: {
    userId: number;
    market: string;
  }): Promise<PaperPortfolio> {
    // 사용자의 가상 계좌 조회
    const account = await this.paperAccountRepository.findOne({
      where: { userId: input.userId },
    });

    if (!account) {
      throw new NotFoundException('현재 가장 계좌가 존재하지 않습니다.');
    }

    // 가상 계좌 포지션 조회
    const positions = await this.paperPositionRepository.find({
      where: {
        paperAccountId: account.id,
        market: input.market,
      },
    });

    return {
      cashBalance: Number(account.cashBalance),
      totalAssetValue: Number(account.cashBalance),
      positions: positions.map((position) => ({
        market: position.market,
        quantity: Number(position.quantity),
        averageEntryPrice: Number(position.averageEntryPrice),
      })),
    };
  }

  // 기본 사용자 가상 계좌 생성 메서드
  async createDefaultAccountForUser(
    userId: number,
  ): Promise<PaperAccountEntity> {
    const existing = await this.paperAccountRepository.findOne({
      where: { userId },
    });

    if (existing) {
      return existing;
    }

    return this.paperAccountRepository.save(
      this.paperAccountRepository.create({
        userId,
        baseCurrency: 'KRW',
        cashBalance: '10000000',
        initialCashBalance: '10000000',
      }),
    );
  }
}
