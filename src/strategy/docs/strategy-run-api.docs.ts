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

const strategyRunGraphExample = {
  runId: 1,
  strategyId: 1,
  status: 'succeeded',
  nodes: [
    {
      id: '1-market_data',
      stepName: 'market_data',
      label: '시장 데이터 수집',
      status: 'succeeded',
      summary: 'KRW-BTC 캔들 데이터를 3개 timeframe에서 조회했습니다.',
      sequence: 1,
    },
    {
      id: '2-portfolio',
      stepName: 'portfolio',
      label: '포트폴리오 조회',
      status: 'succeeded',
      summary: 'paper trading 가상 포트폴리오를 조회했습니다.',
      sequence: 2,
    },
    {
      id: '3-news',
      stepName: 'news',
      label: '뉴스 수집',
      status: 'skipped',
      summary: '전략 설정에서 뉴스 검색을 허용하지 않아 생략했습니다.',
      sequence: 3,
    },
    {
      id: '4-asset_summary',
      stepName: 'asset_summary',
      label: '자산 요약 수집',
      status: 'succeeded',
      summary: '비트코인 자산 요약 데이터를 수집했습니다.',
      sequence: 4,
    },
    {
      id: '5-ai_decision',
      stepName: 'ai_decision',
      label: 'AI 판단',
      status: 'succeeded',
      summary: '주문 금액이 작아질 수 있어 낮은 비중의 매수를 제안합니다.',
      sequence: 5,
    },
    {
      id: '6-risk_check',
      stepName: 'risk_check',
      label: '리스크 체크',
      status: 'succeeded',
      summary: 'Risk check를 통과하지 못했습니다.',
      sequence: 6,
    },
    {
      id: '7-ai_decision',
      stepName: 'ai_decision',
      label: 'AI 판단',
      status: 'succeeded',
      summary: '이전 risk check 실패 사유를 반영해 주문 비중을 조정했습니다.',
      sequence: 7,
    },
    {
      id: '8-risk_check',
      stepName: 'risk_check',
      label: '리스크 체크',
      status: 'succeeded',
      summary: 'Risk check를 통과했습니다.',
      sequence: 8,
    },
    {
      id: '9-order',
      stepName: 'order',
      label: '주문 처리',
      status: 'skipped',
      summary:
        '사용자 확인 모드이므로 주문 후보를 승인 대기 상태로 저장했습니다.',
      sequence: 9,
    },
    {
      id: '10-approval',
      stepName: 'approval',
      label: '사용자 승인',
      status: 'pending',
      summary: '사용자 수락 또는 거절을 기다리는 중입니다.',
      sequence: 10,
    },
  ],
  edges: [
    { source: '1-market_data', target: '2-portfolio' },
    { source: '2-portfolio', target: '3-news' },
    { source: '3-news', target: '4-asset_summary' },
    { source: '4-asset_summary', target: '5-ai_decision' },
    { source: '5-ai_decision', target: '6-risk_check' },
    { source: '6-risk_check', target: '7-ai_decision' },
    { source: '7-ai_decision', target: '8-risk_check' },
    { source: '8-risk_check', target: '9-order' },
    { source: '9-order', target: '10-approval' },
  ],
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
      name: 'market',
      required: false,
      example: 'KRW-BTC',
      description:
        '특정 마켓의 실행 이력만 조회할 때 사용합니다. strategy_runs는 strategyId를 통해 strategies.market을 기준으로 필터링합니다.',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: StrategyRunStatus,
      example: StrategyRunStatus.SUCCEEDED,
      description: '전략 실행 상태 필터입니다.',
    }),
    ApiQuery({
      name: 'dateFrom',
      required: false,
      example: '2026-06-01T00:00:00.000Z',
      description: '이 시각 이후 시작된 전략 실행 이력을 조회합니다.',
    }),
    ApiQuery({
      name: 'dateTo',
      required: false,
      example: '2026-06-30T23:59:59.999Z',
      description: '이 시각 이전 시작된 전략 실행 이력을 조회합니다.',
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
        '페이지네이션 또는 필터 값이 유효하지 않습니다. page, limit, strategyId, market, status, dateFrom, dateTo 값을 확인해야 합니다.',
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

export function ApiGetStrategyRunGraph() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 실행 그래프 조회',
      description:
        '로그인 사용자의 특정 전략 실행 이력을 화면용 graph node/edge 형태로 조회합니다. strategy_runs.result.steps에 저장된 실행 결과를 기반으로 반환하며, risk check 재시도로 ai_decision/risk_check가 여러 번 실행된 경우에도 sequence 순서대로 노드를 반환합니다. 사용자 확인 모드에서 주문 후보 approval이 생성된 경우에는 사용자 승인 node를 마지막에 추가해 pending, approved, rejected, executed, cancelled 상태를 표시합니다.',
    }),
    ApiParam({
      name: 'runId',
      example: 1,
      description: 'graph 형태로 조회할 전략 실행 이력 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 실행 그래프 조회 성공',
      schema: {
        example: strategyRunGraphExample,
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
