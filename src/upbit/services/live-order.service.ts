import { Injectable } from '@nestjs/common';

import { UpbitAuthService } from '@/upbit/services/upbit.auth.service';
import { UpbitPrivateService } from '@/upbit/services/upbit.private.service';

import { RiskCheckResult } from '../../strategy/types/risk-check-result.type';
import { TradeOrderResult } from '../../strategy/types/trade-order-result.type';

@Injectable()
export class LiveOrderService {
  constructor(
    private readonly upbitAuthService: UpbitAuthService,
    private readonly upbitPrivateService: UpbitPrivateService,
  ) {}

  async execute(input: {
    userId: number;
    market: string;
    riskCheck: RiskCheckResult;
  }): Promise<TradeOrderResult> {
    // Risk check를 통과한 주문 후보만 실제 주문으로 변환
    const adjustedOrder = input.riskCheck.adjustedOrder;

    if (!input.riskCheck.passed || !adjustedOrder) {
      return {
        mode: 'live',
        market: input.market,
        decision: null,
        orderType: 'market',
        amountKrw: 0,
        volume: null,
        priceKrw: null,
        status: 'skipped',
        externalOrderId: null,
        reason: 'Risk check를 통과하지 못해 live 주문을 생략했습니다.',
      };
    }

    // upbit에서 사용할 accesskey secretkey를 복호화하여 가져옴
    const credential = await this.upbitAuthService.getDecryptedCredential(
      input.userId,
    );

    // 주문 타입에 맞춰 Upbit API payload 생성
    const payload = this.createUpbitOrderPayload({
      market: input.market,
      decision: adjustedOrder.decision,
      orderType: adjustedOrder.orderType,
      limitPrice: adjustedOrder.limitPrice,
      amountKrw: adjustedOrder.estimatedOrderAmountKrw,
      volume: adjustedOrder.estimatedVolume,
    });

    // 실제 주문 전에 Upbit 주문 테스트로 payload와 잔고를 검증
    const testResult = await this.tryTestOrder({
      accessKey: credential.accessKey,
      secretKey: credential.secretKey,
      payload,
    });

    if (!testResult.ok) {
      return {
        mode: 'live',
        market: input.market,
        decision: adjustedOrder.decision,
        orderType: adjustedOrder.orderType,
        amountKrw: adjustedOrder.estimatedOrderAmountKrw,
        volume: adjustedOrder.estimatedVolume,
        priceKrw: adjustedOrder.priceKrw,
        status: 'failed',
        externalOrderId: null,
        reason: `Upbit 주문 테스트에 실패했습니다. ${testResult.reason}`,
      };
    }

    try {
      // 테스트가 통과한 경우에만 실제 주문 생성
      const orderResult = await this.upbitPrivateService.createOrder({
        accessKey: credential.accessKey,
        secretKey: credential.secretKey,
        ...payload,
      });

      return {
        mode: 'live',
        market: input.market,
        decision: adjustedOrder.decision,
        orderType: adjustedOrder.orderType,
        amountKrw: adjustedOrder.estimatedOrderAmountKrw,
        volume: adjustedOrder.estimatedVolume,
        priceKrw: adjustedOrder.priceKrw,
        status: 'created',
        externalOrderId: orderResult.uuid,
        reason: 'live 주문을 생성했습니다.',
      };
    } catch (error) {
      return {
        mode: 'live',
        market: input.market,
        decision: adjustedOrder.decision,
        orderType: adjustedOrder.orderType,
        amountKrw: adjustedOrder.estimatedOrderAmountKrw,
        volume: adjustedOrder.estimatedVolume,
        priceKrw: adjustedOrder.priceKrw,
        status: 'failed',
        externalOrderId: null,
        reason:
          error instanceof Error
            ? `live 주문 생성에 실패했습니다. ${error.message}`
            : 'live 주문 생성에 실패했습니다.',
      };
    }
  }

  // 내부 주문 후보를 Upbit 주문 파라미터로 변환
  private createUpbitOrderPayload(input: {
    market: string;
    decision: 'buy' | 'sell';
    orderType: 'market' | 'limit';
    limitPrice: number | null;
    amountKrw: number;
    volume: number;
  }) {
    const side: 'bid' | 'ask' = input.decision === 'buy' ? 'bid' : 'ask';

    // 지정가 주문은 매수/매도 모두 가격과 수량이 필요
    if (input.orderType === 'limit') {
      if (input.limitPrice === null) {
        throw new Error('지정가 주문에는 limitPrice가 필요합니다.');
      }

      return {
        market: input.market,
        side,
        ordType: 'limit' as const,
        price: String(input.limitPrice),
        volume: String(input.volume),
      };
    }

    // 시장가 매수는 총 매수 금액을 price로 전달
    if (input.decision === 'buy') {
      return {
        market: input.market,
        side: 'bid' as const,
        ordType: 'price' as const,
        price: String(Math.floor(input.amountKrw)),
      };
    }

    // 시장가 매도는 매도 수량을 volume으로 전달
    return {
      market: input.market,
      side: 'ask' as const,
      ordType: 'market' as const,
      volume: String(input.volume),
    };
  }

  // 테스트 order에 대해서 실패 했을 경우에 대한 응답
  private async tryTestOrder(input: {
    accessKey: string;
    secretKey: string;
    payload: {
      market: string;
      side: 'bid' | 'ask';
      ordType: 'price' | 'market' | 'limit';
      price?: string;
      volume?: string;
    };
  }): Promise<
    { ok: true; externalOrderId: string | null } | { ok: false; reason: string }
  > {
    try {
      const result = await this.upbitPrivateService.testOrder({
        accessKey: input.accessKey,
        secretKey: input.secretKey,
        ...input.payload,
      });

      return {
        ok: true,
        externalOrderId: result.uuid ?? null,
      };
    } catch (error) {
      return {
        ok: false,
        reason:
          error instanceof Error
            ? error.message
            : '알 수 없는 주문 테스트 실패가 발생했습니다.',
      };
    }
  }
}
