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

import { UpdateStrategyDto } from '../dto/update-strategy.dto';

const strategyExample = {
  id: 1,
  userId: 1,
  name: '1시간 추세 추종 전략',
  exchange: 'upbit',
  market: 'KRW-BTC',
  prompt:
    '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
  strategyMode: 'paper',
  intervalMinutes: 60,
  scheduleAnchorAt: '2026-06-02T01:00:00.000Z',
  nextRunAt: null,
  enabled: false,
  strategyStatus: 'draft',
  structuredStrategy: null,
  createdAt: '2026-06-02T01:00:00.000Z',
  updatedAt: '2026-06-02T01:00:00.000Z',
};

export function ApiGetStrategies() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 목록 조회',
      description:
        '로그인 사용자가 생성한 전략 목록을 최신순으로 조회합니다. 페이지네이션과 마켓, 상태, 모드, 활성화 여부 필터를 지원합니다.',
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
      name: 'market',
      required: false,
      example: 'KRW-BTC',
      description: '마켓 필터입니다. KRW-BTC 형식을 사용합니다.',
    }),
    ApiQuery({
      name: 'strategyStatus',
      required: false,
      enum: ['draft', 'active', 'paused', 'archived'],
      description: '전략 상태 필터입니다.',
    }),
    ApiQuery({
      name: 'strategyMode',
      required: false,
      enum: ['paper', 'live'],
      description: '전략 실행 모드 필터입니다.',
    }),
    ApiQuery({
      name: 'enabled',
      required: false,
      example: false,
      description: '자동 실행 활성화 여부 필터입니다.',
    }),
    ApiOkResponse({
      description: '전략 목록 조회 성공',
      schema: {
        example: {
          items: [strategyExample],
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
        '페이지네이션 또는 필터 값이 유효하지 않습니다. page, limit, market, strategyStatus, strategyMode, enabled 값을 확인해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 상세 조회',
      description:
        '로그인 사용자의 특정 전략을 조회합니다. 다른 사용자의 전략은 조회할 수 없습니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '조회할 전략 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 상세 조회 성공',
      schema: {
        example: strategyExample,
      },
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않거나 현재 사용자의 전략이 아닙니다.',
    }),
  );
}

export function ApiCreateStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 생성',
      description:
        '로그인 사용자의 자연어 투자 전략 초안을 생성합니다. 생성된 전략은 기본적으로 가상 거래 모드, 비활성화 상태, 초안 상태로 저장됩니다.',
    }),
    ApiOkResponse({
      description: '전략 생성 성공',
      schema: {
        example: strategyExample,
      },
    }),
    ApiBadRequestResponse({
      description:
        '요청 값이 유효하지 않습니다. market, intervalMinutes, scheduleAnchorAt 형식을 확인해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiUpdateStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 수정',
      description:
        '로그인 사용자의 특정 전략을 수정합니다. 요청 바디에는 변경할 필드만 전달하면 됩니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '수정할 전략 ID입니다.',
    }),
    ApiBody({
      type: UpdateStrategyDto,
      description: '수정할 전략 필드입니다. 모든 필드는 선택값입니다.',
    }),
    ApiOkResponse({
      description: '전략 수정 성공',
      schema: {
        example: {
          ...strategyExample,
          name: '수정된 15분 단기 모멘텀 전략',
          prompt:
            '비트코인이 단기 이동평균선 위에 있고 거래량이 증가할 때만 가상 매수하고 싶어요.',
          intervalMinutes: 15,
          scheduleAnchorAt: '2026-06-02T01:15:00.000Z',
          updatedAt: '2026-06-02T01:10:00.000Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        '요청 값이 유효하지 않습니다. market, intervalMinutes, scheduleAnchorAt 형식을 확인해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않거나 현재 사용자의 전략이 아닙니다.',
    }),
  );
}
