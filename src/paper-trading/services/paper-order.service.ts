import { RiskCheckResult } from '@/strategy/types/risk-check-result.type';
import { TradeOrderResult } from '@/strategy/types/trade-order-result.type';
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PaperAccountEntity } from '../entities/paper-account.entity';
import { PaperPositionEntity } from '../entities/paper-position.entity';

@Injectable()
export class PaperOrderService {
  constructor(private readonly dataSource: DataSource) {}

  async execute(input: {
    userId: number;
    market: string;
    riskCheck: RiskCheckResult;
  }): Promise<TradeOrderResult> {
    // Risk check가 만든 주문 후보를 기준으로 paper 주문을 처리
    const adjustedOrder = input.riskCheck.adjustedOrder;

    if (!input.riskCheck.passed || !adjustedOrder) {
      return {
        mode: 'paper',
        market: input.market,
        decision: null,
        orderType: 'market',
        amountKrw: null,
        volume: null,
        priceKrw: null,
        status: 'skipped',
        externalOrderId: null,
        reason: 'Risk check를 통과하지 못해 paper 주문을 생략했습니다.',
      };
    }

    return this.dataSource.transaction<TradeOrderResult>(async (manager) => {
      // 잔고와 포지션 갱신은 하나의 transaction으로 묶어서 처리
      const accountRepository = manager.getRepository(PaperAccountEntity);
      const positionRepository = manager.getRepository(PaperPositionEntity);

      const account = await accountRepository.findOne({
        where: { userId: input.userId },
      });

      if (!account) {
        return {
          mode: 'paper',
          market: input.market,
          decision: adjustedOrder.decision,
          orderType: adjustedOrder.orderType,
          amountKrw: adjustedOrder.estimatedOrderAmountKrw,
          volume: adjustedOrder.estimatedVolume,
          priceKrw: adjustedOrder.priceKrw,
          status: 'failed',
          externalOrderId: null,
          reason: 'paper account가 존재하지 않습니다.',
        };
      }

      // 주문 방향에 따라 매수/매도 처리 분기
      if (adjustedOrder.decision === 'buy') {
        return this.buy({
          account,
          accountRepository,
          positionRepository,
          userId: input.userId,
          market: input.market,
          amountKrw: adjustedOrder.estimatedOrderAmountKrw,
          volume: adjustedOrder.estimatedVolume,
          priceKrw: adjustedOrder.priceKrw,
          orderType: adjustedOrder.orderType,
        });
      }

      return this.sell({
        account,
        accountRepository,
        positionRepository,
        userId: input.userId,
        market: input.market,
        amountKrw: adjustedOrder.estimatedOrderAmountKrw,
        volume: adjustedOrder.estimatedVolume,
        priceKrw: adjustedOrder.priceKrw,
        orderType: adjustedOrder.orderType,
      });
    });
  }

  // paper 트레이딩 매수 주문 반영
  private async buy(input: {
    account: PaperAccountEntity;
    accountRepository: Repository<PaperAccountEntity>;
    positionRepository: Repository<PaperPositionEntity>;
    userId: number;
    market: string;
    amountKrw: number;
    volume: number;
    priceKrw: number;
    orderType: 'market' | 'limit';
  }): Promise<TradeOrderResult> {
    const cashBalance = Number(input.account.cashBalance);

    if (cashBalance < input.amountKrw) {
      return {
        mode: 'paper',
        market: input.market,
        decision: 'buy',
        orderType: input.orderType,
        amountKrw: input.amountKrw,
        volume: input.volume,
        priceKrw: input.priceKrw,
        status: 'failed',
        externalOrderId: null,
        reason: 'paper 계좌의 KRW 잔액이 부족합니다.',
      };
    }

    // 기존 포지션이 없으면 새 paper position을 생성
    let position = await input.positionRepository.findOne({
      where: {
        paperAccountId: input.account.id,
        market: input.market,
      },
    });

    if (!position) {
      position = input.positionRepository.create({
        userId: input.userId,
        paperAccountId: input.account.id,
        market: input.market,
        quantity: '0',
        averageEntryPrice: '0',
      });
    }

    const currentQuantity = Number(position.quantity);
    const currentAverageEntryPrice = Number(position.averageEntryPrice);

    // 기존 보유 수량과 신규 매수 금액을 반영해 평단 계산
    const nextQuantity = currentQuantity + input.volume;
    const nextAverageEntryPrice =
      (currentQuantity * currentAverageEntryPrice + input.amountKrw) /
      nextQuantity;

    input.account.cashBalance = String(cashBalance - input.amountKrw);
    position.quantity = String(nextQuantity);
    position.averageEntryPrice = String(nextAverageEntryPrice);

    await input.accountRepository.save(input.account);
    await input.positionRepository.save(position);

    return {
      mode: 'paper',
      market: input.market,
      decision: 'buy',
      orderType: input.orderType,
      amountKrw: input.amountKrw,
      volume: input.volume,
      priceKrw: input.priceKrw,
      status: 'created',
      externalOrderId: null,
      reason: 'paper 매수 주문을 반영했습니다.',
    };
  }

  // paper 트레이딩 매도 주문 반영
  private async sell(input: {
    account: PaperAccountEntity;
    accountRepository: Repository<PaperAccountEntity>;
    positionRepository: Repository<PaperPositionEntity>;
    userId: number;
    market: string;
    amountKrw: number;
    volume: number;
    priceKrw: number;
    orderType: 'market' | 'limit';
  }): Promise<TradeOrderResult> {
    // 현재 보유 포지션을 조회해 매도 가능 수량을 확인
    const position = await input.positionRepository.findOne({
      where: {
        paperAccountId: input.account.id,
        market: input.market,
      },
    });

    if (!position) {
      return {
        mode: 'paper',
        market: input.market,
        decision: 'sell',
        orderType: input.orderType,
        amountKrw: input.amountKrw,
        volume: input.volume,
        priceKrw: input.priceKrw,
        status: 'failed',
        externalOrderId: null,
        reason: '매도할 paper position이 없습니다.',
      };
    }

    const currentQuantity = Number(position.quantity);

    if (currentQuantity < input.volume) {
      return {
        mode: 'paper',
        market: input.market,
        decision: 'sell',
        orderType: input.orderType,
        amountKrw: input.amountKrw,
        volume: input.volume,
        priceKrw: input.priceKrw,
        status: 'failed',
        externalOrderId: null,
        reason: 'paper position 수량이 부족합니다.',
      };
    }

    const nextQuantity = currentQuantity - input.volume;
    const cashBalance = Number(input.account.cashBalance);

    input.account.cashBalance = String(cashBalance + input.amountKrw);

    // 전량 매도면 포지션을 제거하고, 일부 매도면 수량만 갱신
    if (nextQuantity <= 0) {
      await input.positionRepository.remove(position);
    } else {
      position.quantity = String(nextQuantity);
      await input.positionRepository.save(position);
    }

    await input.accountRepository.save(input.account);

    return {
      mode: 'paper',
      market: input.market,
      decision: 'sell',
      orderType: input.orderType,
      amountKrw: input.amountKrw,
      volume: input.volume,
      priceKrw: input.priceKrw,
      status: 'created',
      externalOrderId: null,
      reason: 'paper 매도 주문을 반영했습니다.',
    };
  }
}
