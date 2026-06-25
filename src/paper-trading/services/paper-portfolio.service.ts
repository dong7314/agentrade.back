import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { UpbitPublicService } from '@/upbit/services/upbit.public.service';

import { PaperAccountEntity } from '../entities/paper-account.entity';
import { PaperPositionEntity } from '../entities/paper-position.entity';

import { PaperPortfolio } from '../types/paper-portfolio.type';

@Injectable()
export class PaperPortfolioService {
  constructor(
    @InjectRepository(PaperAccountEntity)
    private readonly paperAccountRepository: Repository<PaperAccountEntity>,
    @InjectRepository(PaperPositionEntity)
    private readonly paperPositionRepository: Repository<PaperPositionEntity>,
    private readonly upbitPublicService: UpbitPublicService,
  ) {}

  // 사용자 가상 포트폴리오 조회
  async getPortfolio(input: {
    userId: number;
    market?: string;
  }): Promise<PaperPortfolio> {
    // 사용자의 가상 계좌 조회
    const account = await this.paperAccountRepository.findOne({
      where: { userId: input.userId },
    });

    if (!account) {
      throw new NotFoundException('현재 가상 계좌가 존재하지 않습니다.');
    }

    // 가상 계좌 포지션 조회
    const positions = await this.paperPositionRepository.find({
      where: {
        paperAccountId: account.id,
        ...(input.market ? { market: input.market } : {}),
      },
    });

    // 현금 잔고는 DB decimal/string 값을 number로 변환해서 계산에 사용
    const cashBalance = Number(account.cashBalance);
    const markets = [...new Set(positions.map((position) => position.market))];

    // 현재가 조회
    const tickers = await this.upbitPublicService.getTickers(markets);

    const tickerByMarket = new Map(
      tickers.map((ticker) => [ticker.market, ticker]),
    );

    // 각 position에 현재가, 평가금액, 미실현 손익을 붙임
    const valuedPositions = positions.map((position) => {
      const quantity = Number(position.quantity);
      const averageEntryPrice = Number(position.averageEntryPrice);

      // 해당 market의 현재가를 찾고, 없으면 임시로 평단가를 사용
      const ticker = tickerByMarket.get(position.market);
      const currentPrice = ticker?.tradePrice ?? averageEntryPrice;

      // 실제 투자 원금 = 보유 수량 * 평균 매수가
      const investedAmountKrw = quantity * averageEntryPrice;

      // 현재 평가금액 = 보유 수량 * 현재가
      const marketValueKrw = quantity * currentPrice;

      // 미실현 손익 = 현재 평가금액 - 투자 원금
      const unrealizedPnlKrw = marketValueKrw - investedAmountKrw;

      // 미실현 수익률 = 미실현 손익 / 투자 원금
      const unrealizedPnlRate =
        investedAmountKrw > 0 ? unrealizedPnlKrw / investedAmountKrw : 0;

      return {
        market: position.market,
        quantity,
        averageEntryPrice,
        currentPrice,
        investedAmountKrw,
        marketValueKrw,
        unrealizedPnlKrw,
        unrealizedPnlRate,
        allocationRatio: 0,
      };
    });

    // 전체 코인 평가금액 합산
    const totalMarketValueKrw = valuedPositions.reduce(
      (sum, position) => sum + position.marketValueKrw,
      0,
    );

    // 전체 투자 원금 합산
    const totalInvestedAmountKrw = valuedPositions.reduce(
      (sum, position) => sum + position.investedAmountKrw,
      0,
    );

    // 전체 미실현 손익 합산
    const totalUnrealizedPnlKrw = valuedPositions.reduce(
      (sum, position) => sum + position.unrealizedPnlKrw,
      0,
    );

    // 총 자산 = 현금 + 현재 코인 평가금액
    const totalAssetValue = cashBalance + totalMarketValueKrw;

    // 전체 미실현 수익률 = 전체 미실현 손익 / 전체 투자 원금
    const totalUnrealizedPnlRate =
      totalInvestedAmountKrw > 0
        ? totalUnrealizedPnlKrw / totalInvestedAmountKrw
        : 0;

    return {
      cashBalance,
      totalAssetValue,
      totalMarketValueKrw,
      totalUnrealizedPnlKrw,
      totalUnrealizedPnlRate,

      // 각 position의 포트폴리오 내 비중을 마지막에 계산해서 붙임
      positions: valuedPositions.map((position) => ({
        ...position,
        allocationRatio:
          totalAssetValue > 0 ? position.marketValueKrw / totalAssetValue : 0,
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
