import { BadRequestException, Injectable } from '@nestjs/common';

import { UpbitPublicService } from '@/upbit/services/upbit.public.service';
import { DashboardMarketSummariesQueryDto } from '../dto/query/dashboard-market-summaries-query.dto';
import { DashboardMarketSummariesResponseDto } from '../dto/response/dashboard-market-summaries-response.dto';
import { DASHBOARD_MARKETS } from '../types/dashboard.markets';

@Injectable()
export class DashboardMarketSummaryService {
  constructor(private readonly upbitPublicService: UpbitPublicService) {}

  async getMarketSummaries(
    query: DashboardMarketSummariesQueryDto,
  ): Promise<DashboardMarketSummariesResponseDto> {
    // query에 마켓 정보가 없으면 기본 주요 마켓 목록을 사용
    const markets = this.parseMarkets(query.markets);

    // upbit ticker api로 여러 마켓의 현재가를 한 번에 조회
    const tickers = await this.upbitPublicService.getTickers(markets);

    return DashboardMarketSummariesResponseDto.fromTickers(tickers);
  }

  private parseMarkets(value?: string): string[] {
    if (!value) {
      return [...DASHBOARD_MARKETS];
    }

    const markets = value
      .split(',')
      .map((market) => market.trim().toUpperCase())
      .filter((market) => market.length > 0);

    if (markets.length === 0) {
      return [...DASHBOARD_MARKETS];
    }

    const invalidMarket = markets.find(
      (market) => !/^KRW-[A-Z]+$/.test(market),
    );

    if (invalidMarket) {
      throw new BadRequestException(
        `market은 KRW-BTC 형식이어야 합니다: ${invalidMarket}`,
      );
    }

    return [...new Set(markets)];
  }
}
