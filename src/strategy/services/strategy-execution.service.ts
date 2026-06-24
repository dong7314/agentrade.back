import { BadRequestException, Injectable } from '@nestjs/common';

import { StrategyEntity } from '../entities/strategy.entity';

import { NewsDataService } from '@/data-collect/services/news-data.service';
import { UpbitAuthService } from '@/upbit/services/upbit.auth.service';
import { AiDecisionService } from './ai-decision.service';
import { UpbitPublicService } from '@/upbit/services/upbit.public.service';
import { UpbitPrivateService } from '@/upbit/services/upbit.private.service';
import { AssetSummaryService } from '@/data-collect/services/asset-summary.service';
import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';

import { createNewsQuery } from '@/data-collect/utils/create-query';
import { toUpbitMinuteUnit } from '@/upbit/types/candle/upbit-minute-unit.type';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';

import {
  StrategyRunResult,
  StrategyRunStepResult,
} from '../types/strategy-run-result.type';
import { StrategyMode } from '../enums/strategy-mode.enum';
import { StructuredStrategy } from '../types/structured-strategy.type';

@Injectable()
export class StrategyExecutionService {
  constructor(
    private readonly newsDataService: NewsDataService,
    private readonly upbitAuthService: UpbitAuthService,
    private readonly aiDecisionService: AiDecisionService,
    private readonly upbitPublicService: UpbitPublicService,
    private readonly upbitPrivateService: UpbitPrivateService,
    private readonly assetSummaryService: AssetSummaryService,
    private readonly paperPortfolioService: PaperPortfolioService,
  ) {}

  async execute(strategy: StrategyEntity): Promise<StrategyRunResult> {
    const structuredStrategy = strategy.structuredStrategy;

    if (!isStructuredStrategy(structuredStrategy)) {
      throw new BadRequestException(
        '구조화되지 않은 전략은 실행할 수 없습니다.',
      );
    }

    // 데이터 수집 단계
    const marketDataStep = await this.collectMarketData(structuredStrategy);
    const portfolioStep = await this.collectPortfolio(strategy);
    const newsStep = await this.collectNews(structuredStrategy);
    const assetSummaryStep = await this.collectAssetSummary(strategy);

    const collectedSteps = [
      marketDataStep,
      portfolioStep,
      newsStep,
      assetSummaryStep,
    ];
    // ai 결정 단계
    const aiDecision = await this.aiDecisionService.decide({
      structuredStrategy,
      steps: collectedSteps,
    });

    const aiDecisionStep: StrategyRunStepResult = {
      name: 'ai_decision',
      status: 'succeeded',
      summary: aiDecision.reason,
      output: aiDecision,
    };
    // 리스트 체크 및 주문 단계
    const riskCheckStep = this.checkRisk(structuredStrategy);
    const orderStep = this.decideOrder(structuredStrategy);

    return {
      decision: aiDecision.decision,
      reason: aiDecision.reason,
      confidence: aiDecision.confidence,
      steps: [...collectedSteps, aiDecisionStep, riskCheckStep, orderStep],
      strategy: {
        id: strategy.id,
        market: strategy.market,
        intervalMinutes: strategy.intervalMinutes,
      },
    };
  }

  // 마켓 데이터 수집
  private async collectMarketData(
    structuredStrategy: StructuredStrategy,
  ): Promise<StrategyRunStepResult> {
    if (!structuredStrategy.dataPermissions.allowMarketData) {
      return {
        name: 'market_data',
        status: 'skipped',
        summary: '전략 설정에서 시장 데이터 조회를 허용하지 않아 생략했습니다.',
      };
    }

    const market = structuredStrategy.marketDataConfig.symbol;
    const timeframes = structuredStrategy.marketDataConfig.timeframes;

    const candleGroups = await Promise.all(
      timeframes.map(async (timeframe) => {
        const unit = toUpbitMinuteUnit(timeframe);

        const candles = await this.upbitPublicService.getMinuteCandles({
          market,
          unit,
          count: 50,
        });

        return {
          timeframe,
          candleCount: candles.length,
          latestClose: candles[0]?.close ?? null,
          latestOpenedAt: candles[0]?.openedAt ?? null,
          candles,
        };
      }),
    );

    return {
      name: 'market_data',
      status: 'succeeded',
      summary: `${market} 캔들 데이터를 ${candleGroups.length}개 timeframe에서 조회했습니다.`,
      output: {
        market,
        primaryTimeframe: structuredStrategy.marketDataConfig.primaryTimeframe,
        candleGroups,
      },
    };
  }

  // 나의 자산 데이터 추가
  private async collectPortfolio(
    strategy: StrategyEntity,
  ): Promise<StrategyRunStepResult> {
    // 가상 투자일 시에는 paper portfolio를 전달
    if (strategy.strategyMode === StrategyMode.PAPER) {
      const portfolio = await this.paperPortfolioService.getPortfolio({
        userId: strategy.userId,
        market: strategy.market,
      });

      return {
        name: 'portfolio',
        status: 'succeeded',
        summary: 'paper trading 가상 포트폴리오를 조회했습니다.',
        output: portfolio,
      };
    } else {
      // 실제 live 트레이딩 시 업비트 계좌를 조회한 후 계좌 데이터 전달
      const credential = await this.upbitAuthService.getDecryptedCredential(
        strategy.userId,
      );

      const balances = await this.upbitPrivateService.getAccounts({
        accessKey: credential.accessKey,
        secretKey: credential.secretKey,
      });

      return {
        name: 'portfolio',
        status: 'succeeded',
        summary: `업비트 자산 ${balances.length}개를 조회했습니다.`,
        output: {
          balanceCount: balances.length,
          balances,
        },
      };
    }
  }

  // 뉴스 데이터 수집
  private async collectNews(
    structuredStrategy: StructuredStrategy,
  ): Promise<StrategyRunStepResult> {
    if (!structuredStrategy.dataPermissions.allowNewsSearch) {
      return {
        name: 'news',
        status: 'skipped',
        summary: '전략 설정에서 뉴스 검색을 허용하지 않아 생략했습니다.',
        output: {
          enabled: false,
          articles: [],
        },
      };
    }

    const query = createNewsQuery(structuredStrategy);
    const articles = await this.newsDataService.search({
      query,
      display: 5,
    });

    return {
      name: 'news',
      status: 'succeeded',
      summary: `${query} 관련 뉴스 ${articles.length}개를 조회했습니다.`,
      output: {
        enabled: true,
        query,
        fetchedAt: new Date(),
        articles,
      },
    };
  }

  // 마켓 요약 정보 크롤링 수집
  private async collectAssetSummary(
    strategy: StrategyEntity,
  ): Promise<StrategyRunStepResult> {
    try {
      const assetSummaryData =
        await this.assetSummaryService.getSummaryByMarket(strategy.market);

      const label =
        assetSummaryData.asset.koreanName ?? assetSummaryData.symbol;

      return {
        name: 'asset_summary',
        status: 'succeeded',
        summary: `${label} 자산 요약 데이터를 수집했습니다.`,
        output: assetSummaryData,
      };
    } catch (error) {
      return {
        name: 'asset_summary',
        status: 'failed',
        summary: `자산 요약 데이터 수집에 실패했습니다.`,
        output: {
          market: strategy.market,
          reason: error instanceof Error ? error.message : 'unknown error',
        },
      };
    }
  }

  // 리스크 체크
  private checkRisk(
    structuredStrategy: StructuredStrategy,
  ): StrategyRunStepResult {
    return {
      name: 'risk_check',
      status: 'skipped',
      summary: `${structuredStrategy.riskPreferences.riskLevel} mock 실행에서는 리스크 검사를 생략했습니다.`,
    };
  }

  // 결정 단계 생성
  private decideOrder(
    structuredStrategy: StructuredStrategy,
  ): StrategyRunStepResult {
    return {
      name: 'order',
      status: 'skipped',
      summary: `${structuredStrategy.version} mock 실행에서는 주문을 생성하지 않았습니다.`,
    };
  }
}
