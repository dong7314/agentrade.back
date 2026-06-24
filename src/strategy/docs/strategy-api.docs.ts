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
  ApiNoContentResponse,
} from '@nestjs/swagger';

import { CreateStrategyDto } from '../dto/create-strategy.dto';
import { UpdateStrategyDto } from '../dto/update-strategy.dto';
import { UpdateStrategyStatusDto } from '../dto/update-strategy-status.dto';
import { StrategyJudgmentMode } from '../enums/strategy-judgment-mode.enum';

const strategyExample = {
  id: 1,
  userId: 1,
  name: '1시간 추세 추종 전략',
  exchange: 'upbit',
  market: 'KRW-BTC',
  prompt:
    '비트코인이 20일 이동평균선 위에 있고 RSI가 30 이하일 때만 소액 매수하고 싶어요.',
  strategyMode: 'paper',
  strategyJudgmentMode: 'user',
  intervalMinutes: 60,
  scheduleAnchorAt: '2026-06-02T01:00:00.000Z',
  nextRunAt: null,
  enabled: false,
  strategyStatus: 'draft',
  structuredStrategy: null,
  allowMarketData: true,
  allowNewsSearch: false,
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
        '로그인 사용자의 자연어 투자 전략 초안을 생성합니다. 생성된 전략은 기본적으로 가상 거래 모드, 사용자 승인 판단 모드, 마켓 데이터 조회 허용, 뉴스 검색 비허용, 비활성화 상태, 초안 상태로 저장됩니다.',
    }),
    ApiBody({
      type: CreateStrategyDto,
      description:
        '생성할 전략 정보입니다. strategyMode, strategyJudgmentMode, allowMarketData, allowNewsSearch는 선택값입니다.',
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
          strategyJudgmentMode: StrategyJudgmentMode.AI,
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

export function ApiUpdateStrategyStatus() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 상태 변경',
      description:
        '로그인 사용자의 특정 전략 상태를 변경합니다. active 전환 시 자동 실행 대상으로 등록되고, paused 또는 archived 전환 시 자동 실행 대상에서 제외됩니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '상태를 변경할 전략 ID입니다.',
    }),
    ApiBody({
      type: UpdateStrategyStatusDto,
      description: '변경할 전략 상태입니다.',
      examples: {
        active: {
          summary: '전략 활성화',
          value: { strategyStatus: 'active' },
        },
        paused: {
          summary: '전략 일시정지',
          value: { strategyStatus: 'paused' },
        },
        archived: {
          summary: '전략 보관',
          value: { strategyStatus: 'archived' },
        },
      },
    }),
    ApiOkResponse({
      description: '전략 상태 변경 성공',
      schema: {
        example: {
          ...strategyExample,
          enabled: true,
          strategyStatus: 'active',
          nextRunAt: '2026-06-02T02:00:00.000Z',
          structuredStrategy: {
            version: 1,
            kind: 'ai_execution_plan',
            source: {
              prompt:
                '비트코인이 단기 이동평균선 위에 있고 거래량이 증가할 때만 가상 매수하고 싶어요.',
              market: 'KRW-BTC',
            },
            aiInstructions: {
              summary:
                '사용자의 자연어 전략을 기반으로 안전한 투자 판단을 수행한다.',
              decisionProcess: [
                '시장 뉴스와 거시 이벤트를 확인한다.',
                '지지/저항 구간과 주요 가격 흐름을 확인한다.',
                '근거가 부족하면 매매하지 않는다.',
                '과도한 레버리지와 올인을 피한다.',
                '수익 구간에서는 분할 익절을 고려한다.',
              ],
            },
            dataPermissions: {
              allowNewsSearch: true,
              allowMarketData: true,
            },
            judgment: 'ai',
            marketDataConfig: {
              symbol: 'KRW-BTC',
              timeframes: ['15m', '30m', '1h'],
              primaryTimeframe: '1h',
            },
            riskPreferences: {
              riskLevel: 'conservative',
              maxIdeaExposureFraction: 0.3,
              positionSizeFraction: 0.1,
              allowLeverage: false,
            },
            humanReview: {
              requiredBeforeLiveTrading: true,
              requiredWhenConfidenceBelow: 0.7,
            },
          },
          updatedAt: '2026-06-02T01:10:00.000Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        '요청 상태가 유효하지 않거나, 현재 상태에서 변경할 수 없습니다. 구조화되지 않은 전략은 active로 변경할 수 없고, 활성화된 전략은 일시정지 후 보관해야 합니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않거나 현재 사용자의 전략이 아닙니다.',
    }),
  );
}

export function ApiParseStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 구조화',
      description:
        '사용자의 자연어 전략을 AI 실행 지침 JSON으로 구조화하여 structuredStrategy에 저장합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '구조화할 전략 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 구조화 성공',
      schema: {
        example: {
          ...strategyExample,
          structuredStrategy: {
            version: 1,
            kind: 'ai_execution_plan',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: '보관되었거나 활성화된 전략은 구조화할 수 없습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않거나 현재 사용자의 전략이 아닙니다.',
    }),
  );
}

export function ApiRunStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 수동 실행',
      description:
        '로그인 사용자의 특정 전략을 즉시 실행하고 실행 이력을 생성합니다. 전략은 active 상태이고, 자동 실행이 활성화되어 있으며, structuredStrategy가 유효해야 합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '실행할 전략 ID입니다.',
    }),
    ApiOkResponse({
      description: '전략 수동 실행 성공',
      schema: {
        example: {
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
                status: 'succeeded',
                summary:
                  'KRW-BTC 캔들 데이터를 3개 timeframe에서 조회했습니다.',
                output: {
                  market: 'KRW-BTC',
                  primaryTimeframe: '1h',
                  candleGroups: [
                    {
                      timeframe: '15m',
                      candleCount: 50,
                      latestClose: 100000000,
                    },
                    {
                      timeframe: '30m',
                      candleCount: 50,
                      latestClose: 100100000,
                    },
                    {
                      timeframe: '1h',
                      candleCount: 50,
                      latestClose: 100200000,
                    },
                  ],
                },
              },
              {
                name: 'portfolio',
                status: 'succeeded',
                summary: 'paper trading 가상 포트폴리오를 조회했습니다.',
                output: {
                  cashBalance: 10000000,
                  totalAssetValue: 10000000,
                  positions: [],
                },
              },
              {
                name: 'news',
                status: 'succeeded',
                summary: '비트코인 관련 뉴스 5개를 조회했습니다.',
                output: {
                  enabled: true,
                  query: '비트코인',
                  articles: [
                    {
                      title: '비트코인 관련 뉴스 제목',
                      link: 'https://example.com/news',
                      source: 'naver',
                      publishedAt: '2026-06-02T01:00:00.000Z',
                      description: '뉴스 요약입니다.',
                    },
                  ],
                },
              },
              {
                name: 'ai_decision',
                status: 'succeeded',
                summary: 'mock 판단으로 hold를 반환했습니다.',
                output: {
                  decision: 'hold',
                  confidence: 0.5,
                },
              },
              {
                name: 'risk_check',
                status: 'skipped',
                summary: 'balanced mock 실행에서는 리스크 검사를 생략했습니다.',
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
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        '전략이 active 상태가 아니거나, 자동 실행이 비활성화되어 있거나, structuredStrategy가 유효하지 않거나, 이미 실행 중인 전략입니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않거나 현재 사용자의 전략이 아닙니다.',
    }),
  );
}

export function ApiDeleteStrategy() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '전략 삭제',
      description:
        '로그인 사용자의 전략을 삭제합니다. 실제 row는 삭제하지 않고 deleted_at을 기록하는 soft delete 방식입니다. 활성화된 전략은 일시정지 후 삭제할 수 있습니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '삭제할 전략 ID입니다.',
    }),
    ApiNoContentResponse({
      description: '전략 삭제 성공',
    }),
    ApiBadRequestResponse({
      description: '활성화된 전략은 일시정지 후 삭제할 수 있습니다.',
    }),
    ApiNotFoundResponse({
      description: '전략이 존재하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}
