import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateTradeMarketDto } from '../dto/create-trade-market.dto';
import { UpdateTradeMarketDto } from '../dto/update-trade-market.dto';
import { TradeMarketResponseDto } from '../dto/trade-market-response.dto';

export function ApiGetTradeMarkets() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '지원 마켓 목록 조회',
      description:
        '전략 생성/수정 화면에서 선택할 수 있는 활성화된 지원 마켓 목록을 조회합니다. 일반 사용자는 enabled=true인 마켓만 조회합니다.',
    }),
    ApiQuery({
      name: 'quote',
      required: false,
      example: 'KRW',
      description: 'quote currency 기준 필터입니다. 예: KRW, BTC, USDT',
    }),
    ApiOkResponse({
      description: '지원 마켓 목록 조회 성공',
      type: [TradeMarketResponseDto],
    }),
    ApiBadRequestResponse({
      description: 'query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetAdminTradeMarkets() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 지원 마켓 목록 조회',
      description:
        '관리자가 활성/비활성 지원 마켓을 모두 조회합니다. enabled query를 생략하면 전체를 반환합니다.',
    }),
    ApiQuery({
      name: 'quote',
      required: false,
      example: 'KRW',
      description: 'quote currency 기준 필터입니다.',
    }),
    ApiQuery({
      name: 'enabled',
      required: false,
      example: 'false',
      description:
        '활성화 여부 필터입니다. true, false 중 하나를 전달합니다. 생략하면 전체를 조회합니다.',
    }),
    ApiOkResponse({
      description: '관리자 지원 마켓 목록 조회 성공',
      type: [TradeMarketResponseDto],
    }),
    ApiBadRequestResponse({
      description: 'query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
  );
}

export function ApiCreateTradeMarket() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 지원 마켓 추가',
      description:
        '관리자가 서비스에서 지원할 거래 마켓을 추가합니다. 예: KRW-BTC, KRW-ETH',
    }),
    ApiBody({
      type: CreateTradeMarketDto,
      description: '추가할 지원 마켓 정보입니다.',
    }),
    ApiOkResponse({
      description: '지원 마켓 추가 성공',
      type: TradeMarketResponseDto,
    }),
    ApiBadRequestResponse({
      description: '요청 body 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
    ApiConflictResponse({
      description: '이미 등록된 마켓입니다.',
    }),
  );
}

export function ApiUpdateTradeMarket() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 지원 마켓 수정',
      description:
        '관리자가 지원 마켓의 이름, 활성화 여부, 정렬 순서 등을 수정합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '수정할 지원 마켓 ID입니다.',
    }),
    ApiBody({
      type: UpdateTradeMarketDto,
      description: '수정할 지원 마켓 정보입니다. 필요한 필드만 전달합니다.',
    }),
    ApiOkResponse({
      description: '지원 마켓 수정 성공',
      type: TradeMarketResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'path parameter 또는 요청 body 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
    ApiConflictResponse({
      description: '수정하려는 exchange/market 조합이 이미 등록되어 있습니다.',
    }),
    ApiNotFoundResponse({
      description: '마켓이 존재하지 않습니다.',
    }),
  );
}

export function ApiDisableTradeMarket() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 지원 마켓 비활성화',
      description:
        '관리자가 지원 마켓을 비활성화합니다. 과거 전략/실행 이력을 보존하기 위해 물리 삭제 대신 enabled=false로 변경합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '비활성화할 지원 마켓 ID입니다.',
    }),
    ApiNoContentResponse({
      description: '지원 마켓 비활성화 성공',
    }),
    ApiBadRequestResponse({
      description: 'id path parameter가 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
    ApiNotFoundResponse({
      description: '마켓이 존재하지 않습니다.',
    }),
  );
}
