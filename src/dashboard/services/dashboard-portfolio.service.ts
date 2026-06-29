import { Injectable } from '@nestjs/common';

import { UpbitAuthService } from '@/upbit/services/upbit.auth.service';
import { UpbitPublicService } from '@/upbit/services/upbit.public.service';
import { UpbitPrivateService } from '@/upbit/services/upbit.private.service';
import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';

import { DashboardPortfolioMode } from '../enums/dashboard-portfolio-mode.enum';
import { DashboardPortfolioQueryDto } from '../dto/query/dashboard-portfolio-query.dto';
import { DashboardPortfolioResponseDto } from '../dto/response/dashboard-portfolio-response.dto';

@Injectable()
export class DashboardPortfolioService {
  constructor(
    private readonly upbitAuthService: UpbitAuthService,
    private readonly upbitPublicService: UpbitPublicService,
    private readonly upbitPrivateService: UpbitPrivateService,
    private readonly paperPortfolioService: PaperPortfolioService,
  ) {}

  async getPortfolio(input: {
    userId: number;
    query: DashboardPortfolioQueryDto;
  }): Promise<DashboardPortfolioResponseDto> {
    // mode에 따라 paper/live 포트폴리오 조회를 분기
    if (input.query.mode === DashboardPortfolioMode.PAPER) {
      return this.getPaperPortfolio({
        userId: input.userId,
        market: input.query.market,
      });
    }

    return this.getLivePortfolio({
      userId: input.userId,
      market: input.query.market,
    });
  }

  private async getPaperPortfolio(input: {
    userId: number;
    market?: string;
  }): Promise<DashboardPortfolioResponseDto> {
    // 기존 paper portfolio 평가 서비스를 대시보드 응답으로 변환
    const portfolio = await this.paperPortfolioService.getPortfolio({
      userId: input.userId,
      market: input.market,
    });

    return DashboardPortfolioResponseDto.fromPaperPortfolio(portfolio);
  }

  private async getLivePortfolio(input: {
    userId: number;
    market?: string;
  }): Promise<DashboardPortfolioResponseDto> {
    // 사용자의 Upbit credential을 복호화해서 실제 계좌 조회
    const credential = await this.upbitAuthService.getDecryptedCredential(
      input.userId,
    );

    const balances = await this.upbitPrivateService.getAccounts({
      accessKey: credential.accessKey,
      secretKey: credential.secretKey,
    });

    // KRW 잔고는 현금으로 분리
    const krwBalance = balances.find((balance) => balance.currency === 'KRW');
    const cashBalance = krwBalance?.balance ?? 0;

    // 코인 잔고만 market 형태로 변환
    const assetBalances = balances.filter(
      (balance) =>
        balance.currency !== 'KRW' && balance.balance + balance.locked > 0,
    );

    const markets = assetBalances
      .map((balance) => `${balance.unitCurrency}-${balance.currency}`)
      .filter((market) => !input.market || market === input.market);

    // 보유 코인의 현재가를 한 번에 조회
    const tickers = await this.upbitPublicService.getTickers(markets);
    const tickerByMarket = new Map(
      tickers.map((ticker) => [ticker.market, ticker]),
    );

    // live 잔고를 평가금액/손익 포함 포지션으로 변환
    const positions = assetBalances
      .map((balance) => {
        const market = `${balance.unitCurrency}-${balance.currency}`;

        if (input.market && market !== input.market) {
          return null;
        }

        const quantity = balance.balance + balance.locked;
        const averageEntryPrice = balance.avgBuyPrice;
        const currentPrice = tickerByMarket.get(market)?.tradePrice ?? 0;

        const investedAmountKrw =
          averageEntryPrice !== null ? quantity * averageEntryPrice : 0;
        const marketValueKrw = quantity * currentPrice;
        const unrealizedPnlKrw = marketValueKrw - investedAmountKrw;
        const unrealizedPnlRate =
          investedAmountKrw > 0 ? unrealizedPnlKrw / investedAmountKrw : 0;

        return {
          market,
          quantity,
          averageEntryPrice,
          currentPrice,
          investedAmountKrw,
          marketValueKrw,
          unrealizedPnlKrw,
          unrealizedPnlRate,
          allocationRatio: 0,
        };
      })
      .filter((position) => position !== null);

    // 전체 평가금액과 손익을 합산
    const totalMarketValueKrw = positions.reduce(
      (sum, position) => sum + position.marketValueKrw,
      0,
    );

    const totalInvestedAmountKrw = positions.reduce(
      (sum, position) => sum + position.investedAmountKrw,
      0,
    );

    const totalUnrealizedPnlKrw = positions.reduce(
      (sum, position) => sum + position.unrealizedPnlKrw,
      0,
    );

    const totalAssetValue = cashBalance + totalMarketValueKrw;

    const totalUnrealizedPnlRate =
      totalInvestedAmountKrw > 0
        ? totalUnrealizedPnlKrw / totalInvestedAmountKrw
        : 0;

    return {
      mode: DashboardPortfolioMode.LIVE,
      cashBalance,
      totalAssetValue,
      totalMarketValueKrw,
      totalUnrealizedPnlKrw,
      totalUnrealizedPnlRate,
      positions: positions.map((position) => ({
        ...position,
        allocationRatio:
          totalAssetValue > 0 ? position.marketValueKrw / totalAssetValue : 0,
      })),
    };
  }
}
