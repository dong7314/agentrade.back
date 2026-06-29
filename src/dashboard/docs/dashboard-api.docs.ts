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

import { DashboardPortfolioMode } from '../enums/dashboard-portfolio-mode.enum';
import { DashboardChartResponseDto } from '../dto/response/dashboard-chart-response.dto';
import { DashboardLatestRunResponseDto } from '../dto/response/dashboard-latest-run-response.dto';
import { DashboardPortfolioResponseDto } from '../dto/response/dashboard-portfolio-response.dto';
import { DashboardTradeLogsResponseDto } from '../dto/response/dashboard-trade-log-response.dto';
import { DashboardMarketSummariesResponseDto } from '../dto/response/dashboard-market-summaries-response.dto';

export function ApiGetDashboardPortfolio() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '대시보드 포트폴리오 조회',
      description:
        'paper 또는 live 모드의 포트폴리오 평가금액, 현금, 포지션, 미실현 손익을 조회합니다.',
    }),
    ApiQuery({
      name: 'mode',
      enum: DashboardPortfolioMode,
      required: true,
      example: DashboardPortfolioMode.PAPER,
      description: '조회할 포트폴리오 모드입니다.',
    }),
    ApiQuery({
      name: 'market',
      required: false,
      example: 'KRW-BTC',
      description: '특정 마켓만 조회하고 싶을 때 전달합니다.',
    }),
    ApiOkResponse({
      description: '포트폴리오 조회 성공',
      type: DashboardPortfolioResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'mode 또는 market query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetDashboardLatestRun() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '대시보드 최신 전략 실행 조회',
      description:
        '특정 전략의 가장 최근 실행 이력을 조회합니다. AI 판단, risk check, workflow steps, order step, 연결된 approval 상태를 대시보드 표시용으로 반환합니다.',
    }),
    ApiParam({
      name: 'strategyId',
      example: 3,
      description: '최근 실행 이력을 조회할 전략 ID입니다.',
    }),
    ApiOkResponse({
      description: '최신 전략 실행 조회 성공',
      type: DashboardLatestRunResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'strategyId path parameter가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiNotFoundResponse({
      description:
        '해당 전략의 실행 이력이 없거나 현재 사용자가 조회할 수 없는 전략입니다.',
    }),
  );
}

export function ApiGetDashboardChart() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '대시보드 차트 조회',
      description:
        '특정 Upbit 마켓의 분봉 캔들 데이터를 조회합니다. 대시보드 차트 렌더링에 사용합니다.',
    }),
    ApiQuery({
      name: 'market',
      required: true,
      example: 'KRW-BTC',
      description: '조회할 마켓입니다.',
    }),
    ApiQuery({
      name: 'timeframe',
      required: true,
      enum: ['1m', '3m', '5m', '10m', '15m', '30m', '1h', '4h'],
      example: '5m',
      description: '조회할 차트 timeframe입니다.',
    }),
    ApiQuery({
      name: 'count',
      required: false,
      example: 50,
      description: '조회할 캔들 개수입니다. 생략하면 50개입니다.',
    }),
    ApiOkResponse({
      description: '차트 조회 성공',
      type: DashboardChartResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'market, timeframe, count query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetDashboardMarketSummaries() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '대시보드 마켓 요약 조회',
      description:
        '대시보드 상단 카드에 표시할 여러 마켓의 현재가, 24시간 등락률, 고가/저가, 거래량, 거래대금을 조회합니다.',
    }),
    ApiQuery({
      name: 'markets',
      required: false,
      example: 'KRW-BTC,KRW-ETH,KRW-XRP',
      description:
        '쉼표로 구분한 마켓 목록입니다. 생략하면 기본 주요 마켓을 조회합니다.',
    }),
    ApiOkResponse({
      description: '마켓 요약 조회 성공',
      type: DashboardMarketSummariesResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'markets query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}
export function ApiGetDashboardTradeLogs() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '대시보드 거래 로그 조회',
      description:
        '현재 단계에서는 strategy_order_approvals 데이터를 기반으로 주문 후보, 승인, 실행 결과 로그를 조회합니다.',
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
      example: 20,
      description: '페이지당 항목 수입니다. 기본값은 20, 최대값은 50입니다.',
    }),
    ApiOkResponse({
      description: '거래 로그 조회 성공',
      type: DashboardTradeLogsResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'page 또는 limit query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}
