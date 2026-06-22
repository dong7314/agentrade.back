import { BadRequestException, Injectable } from '@nestjs/common';

import { StrategyEntity } from '../entities/strategy.entity';

import { UpbitAuthService } from '@/upbit/services/upbit.auth.service';
import { UpbitPublicService } from '@/upbit/services/upbit.public.service';
import { UpbitPrivateService } from '@/upbit/services/upbit.private.service';
import { PaperPortfolioService } from '@/paper-trading/services/paper-portfolio.service';

import { toUpbitMinuteUnit } from '@/upbit/types/candle/upbit-minute-unit.type';
import { isStructuredStrategy } from '../validators/structured-strategy.validator';

import {
  StrategyRunResult,
  StrategyRunStepResult,
} from '../types/strategy-run-result.type';
import { StructuredStrategy } from '../types/structured-strategy.type';
import { StrategyMode } from '../enums/strategy-mode.enum';

@Injectable()
export class StrategyExecutionService {
  constructor(
    private readonly upbitAuthService: UpbitAuthService,
    private readonly upbitPublicService: UpbitPublicService,
    private readonly upbitPrivateService: UpbitPrivateService,
    private readonly paperPortfolioService: PaperPortfolioService,
  ) {}

  async execute(strategy: StrategyEntity): Promise<StrategyRunResult> {
    const structuredStrategy = strategy.structuredStrategy;

    if (!isStructuredStrategy(structuredStrategy)) {
      throw new BadRequestException(
        '구조화되지 않은 전략은 실행할 수 없습니다.',
      );
    }

    const marketDataStep = await this.collectMarketData(structuredStrategy);
    const portfolioStep = await this.collectPortfolio(strategy);
    const newsStep = this.collectNews(structuredStrategy);
    const aiDecisionStep = this.makeAiDecision(structuredStrategy);
    const riskCheckStep = this.checkRisk(structuredStrategy);
    const orderStep = this.decideOrder(structuredStrategy);

    return Promise.resolve({
      decision: 'hold',
      reason: 'mock execution only',
      confidence: 0.5,
      steps: [
        marketDataStep,
        portfolioStep,
        newsStep,
        aiDecisionStep,
        riskCheckStep,
        orderStep,
      ],
      strategy: {
        id: strategy.id,
        market: strategy.market,
        intervalMinutes: strategy.intervalMinutes,
      },
    });
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
  private collectNews(
    structuredStrategy: StructuredStrategy,
  ): StrategyRunStepResult {
    return {
      name: 'news',
      status: structuredStrategy.dataPermissions.allowNewsSearch
        ? 'succeeded'
        : 'skipped',
      summary: `뉴스 조회는 mock 실행에서 생략했습니다.`,
    };
  }

  // AI 판단 생성
  private makeAiDecision(
    structuredStrategy: StructuredStrategy,
  ): StrategyRunStepResult {
    return {
      name: 'ai_decision',
      status: 'succeeded',
      summary: `${structuredStrategy.version} mock 판단으로 hold를 반환했습니다.`,
      output: {
        decision: 'hold',
        confidence: 0.5,
      },
    };
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
