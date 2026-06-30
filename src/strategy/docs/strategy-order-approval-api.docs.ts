import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { StrategyMode } from '../enums/strategy-mode.enum';
import { RejectStrategyOrderApprovalDto } from '../dto/reject-strategy-order-approval.dto';
import { StrategyOrderApprovalStatus } from '../enums/strategy-order-approval-status.enum';

const strategyOrderApprovalExample = {
  id: 1,
  userId: 1,
  strategyId: 3,
  strategyRunId: 15,
  strategyMode: StrategyMode.PAPER,
  market: 'KRW-BTC',
  decision: 'buy',
  orderType: 'market',
  decisionReason:
    '단기 추세와 거래량 흐름이 우호적이지만 변동성이 높아 제한된 비중으로 접근합니다.',
  adjustedOrder: {
    decision: 'buy',
    sizeFraction: 0.1,
    orderType: 'market',
    limitPrice: null,
    priceKrw: 95000000,
    estimatedVolume: 0.001,
    estimatedOrderAmountKrw: 95000,
  },
  riskCheckResult: {
    passed: true,
    retryable: false,
    reason: 'Risk check를 통과했습니다.',
    violations: [],
    adjustedOrder: {
      decision: 'buy',
      sizeFraction: 0.1,
      orderType: 'market',
      limitPrice: null,
      priceKrw: 95000000,
      estimatedVolume: 0.001,
      estimatedOrderAmountKrw: 95000,
    },
  },
  orderResult: null,
  status: StrategyOrderApprovalStatus.PENDING,
  rejectReason: null,
  decidedAt: null,
  createdAt: '2026-06-26T01:00:00.000Z',
  updatedAt: '2026-06-26T01:00:00.000Z',
};

export function ApiGetStrategyOrderApprovals() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 주문 승인 목록 조회',
      description:
        '로그인 사용자의 전략 주문 승인 대기/처리 이력을 최신순으로 조회합니다.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      example: 1,
      description: '페이지 번호입니다. 기본값은 1입니다.',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      example: 15,
      description: '페이지당 항목 수입니다. 기본값은 15, 최대값은 50입니다.',
    }),
    ApiQuery({
      name: 'strategyId',
      required: false,
      example: 3,
      description: '특정 전략의 승인 이력만 조회할 때 사용하는 전략 ID입니다.',
    }),
    ApiQuery({
      name: 'market',
      required: false,
      example: 'KRW-BTC',
      description: '특정 마켓의 승인 이력만 조회할 때 사용합니다.',
    }),
    ApiQuery({
      name: 'mode',
      required: false,
      enum: StrategyMode,
      example: StrategyMode.PAPER,
      description: 'paper 또는 live 전략 모드 기준 필터입니다.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: StrategyOrderApprovalStatus,
      example: StrategyOrderApprovalStatus.PENDING,
      description: '승인 상태 필터입니다.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      example: '2026-06-01T00:00:00.000Z',
      description: '이 시각 이후 생성된 승인 이력을 조회합니다.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      example: '2026-06-30T23:59:59.999Z',
      description: '이 시각 이전 생성된 승인 이력을 조회합니다.',
    }),
    ApiOkResponse({
      description: '전략 주문 승인 목록 조회 성공',
      schema: {
        example: {
          items: [strategyOrderApprovalExample],
          meta: {
            page: 1,
            limit: 15,
            total: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        '페이지네이션 또는 필터 값이 유효하지 않습니다. page, limit, strategyId, market, mode, status, dateFrom, dateTo 값을 확인해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiApproveStrategyOrderApproval() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 주문 후보 승인',
      description:
        'pending 상태의 주문 후보를 승인하고, 전략 모드에 따라 paper/live 주문을 실행합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '승인할 전략 주문 후보 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 주문 후보 승인 성공',
      schema: {
        example: {
          ...strategyOrderApprovalExample,
          orderResult: {
            mode: 'paper',
            market: 'KRW-BTC',
            decision: 'buy',
            orderType: 'market',
            amountKrw: 95000,
            volume: 0.001,
            priceKrw: 95000000,
            status: 'created',
            externalOrderId: null,
            reason: 'paper 매수 주문을 반영했습니다.',
          },
          status: StrategyOrderApprovalStatus.EXECUTED,
          decidedAt: '2026-06-26T01:01:00.000Z',
          updatedAt: '2026-06-26T01:01:00.000Z',
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description:
        'pending 상태인 주문 후보가 존재하지 않거나 현재 사용자의 주문 후보가 아닙니다.',
    }),
  );
}

export function ApiRejectStrategyOrderApproval() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 주문 후보 거절',
      description:
        'pending 상태의 주문 후보를 거절합니다. 거절된 주문 후보는 실제 주문으로 실행되지 않습니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '거절할 전략 주문 후보 ID입니다.',
    }),
    ApiBody({
      type: RejectStrategyOrderApprovalDto,
      required: false,
      description: '거절 사유입니다. 비워도 거절 처리는 가능합니다.',
    }),
    ApiOkResponse({
      description: '전략 주문 후보 거절 성공',
      schema: {
        example: {
          ...strategyOrderApprovalExample,
          status: StrategyOrderApprovalStatus.REJECTED,
          rejectReason: '변동성이 너무 높아서 이번 주문은 보류합니다.',
          decidedAt: '2026-06-26T01:01:00.000Z',
          updatedAt: '2026-06-26T01:01:00.000Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description: '거절 사유 형식이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description:
        'pending 상태인 주문 후보가 존재하지 않거나 현재 사용자의 주문 후보가 아닙니다.',
    }),
  );
}

export function ApiSyncLiveOrderApproval() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: 'live 주문 상태 동기화',
      description:
        '승인 후 생성된 live Upbit 주문의 현재 상태를 조회하고, approval의 orderResult와 status를 최신 상태로 갱신합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '동기화할 live 주문 approval ID입니다.',
    }),
    ApiOkResponse({
      description: 'live 주문 상태 동기화 성공',
      schema: {
        example: {
          ...strategyOrderApprovalExample,
          strategyMode: StrategyMode.LIVE,
          orderResult: {
            mode: 'live',
            market: 'KRW-BTC',
            decision: 'buy',
            orderType: 'limit',
            amountKrw: 95000,
            volume: 0.001,
            priceKrw: 95000000,
            status: 'created',
            externalOrderId: '7c0f8f6a-1111-2222-3333-66f1b8e5a123',
            reason: 'Upbit 주문 상태를 동기화했습니다. state=done',
            liveOrderState: 'done',
            executedVolume: 0.001,
            remainingVolume: 0,
            paidFee: 47.5,
          },
          status: StrategyOrderApprovalStatus.EXECUTED,
          decidedAt: '2026-06-26T01:03:00.000Z',
          updatedAt: '2026-06-26T01:03:00.000Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'live 주문이 아니거나, 동기화할 Upbit 주문 uuid가 없는 approval입니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description:
        'approval이 존재하지 않거나 현재 사용자의 approval이 아닙니다.',
    }),
  );
}
