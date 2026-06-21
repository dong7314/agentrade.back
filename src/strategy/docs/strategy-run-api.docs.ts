import { applyDecorators } from '@nestjs/common';
import {
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { StrategyRunStatus } from '../enums/strategy-run-status.enum';

const strategyRunExample = {
  id: 1,
  strategyId: 1,
  userId: 1,
  status: 'succeeded',
  startedAt: '2026-06-02T01:00:00.000Z',
  finishedAt: '2026-06-02T01:00:02.000Z',
  errorMessage: null,
  result: {
    decision: 'hold',
    reason: 'mock execution only',
    confidence: 0.5,
    steps: [
      {
        name: 'market_data',
        status: 'skipped',
        summary: 'mock 실행에서는 시장 데이터 조회를 생략했습니다.',
      },
      {
        name: 'news',
        status: 'skipped',
        summary: 'mock 실행에서는 뉴스 조회를 생략했습니다.',
      },
      {
        name: 'ai_decision',
        status: 'succeeded',
        summary: 'mock 판단으로 hold를 반환했습니다.',
      },
      {
        name: 'risk_check',
        status: 'skipped',
        summary: 'mock 실행에서는 리스크 검사를 생략했습니다.',
      },
      {
        name: 'order',
        status: 'skipped',
        summary: 'mock 실행에서는 주문을 생성하지 않았습니다.',
      },
    ],
    strategy: {
      id: 1,
      market: 'KRW-BTC',
      intervalMinutes: 60,
    },
  },
  createdAt: '2026-06-02T01:00:00.000Z',
  updatedAt: '2026-06-02T01:00:02.000Z',
};

export function ApiGetStrategyRuns() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 실행 이력 목록 조회',
      description:
        '로그인 사용자의 전략 실행 이력을 최신순으로 조회합니다. 실행 이력은 사용자가 직접 생성하지 않고, 서버 내부 실행 흐름에서 생성됩니다.',
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
      example: 1,
      description: '특정 전략의 실행 이력만 조회할 때 사용하는 전략 ID입니다.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: StrategyRunStatus,
      description: '전략 실행 상태 필터입니다.',
    }),
    ApiOkResponse({
      description: '전략 실행 이력 목록 조회 성공',
      schema: {
        example: {
          items: [strategyRunExample],
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
        '페이지네이션 또는 필터 값이 유효하지 않습니다. page, limit, strategyId, status 값을 확인해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetStrategyRun() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 실행 이력 상세 조회',
      description:
        '로그인 사용자의 특정 전략 실행 이력을 조회합니다. 다른 사용자의 실행 이력은 조회할 수 없습니다.',
    }),
    ApiParam({
      name: 'runId',
      example: 1,
      description: '조회할 전략 실행 이력 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 실행 이력 상세 조회 성공',
      schema: {
        example: strategyRunExample,
      },
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description:
        '전략 실행 이력이 존재하지 않거나 현재 사용자의 이력이 아닙니다.',
    }),
  );
}
