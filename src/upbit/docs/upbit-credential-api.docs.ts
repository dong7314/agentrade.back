import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UpsertUpbitCredentialDto } from '../dto/upsert-upbit-credential.dto';

export function ApiUpsertUpbitCredential() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '업비트 API 키 등록/수정',
      description:
        '로그인 사용자의 업비트 access key와 secret key를 암호화하여 저장합니다. 응답에는 원본 key 값을 절대 포함하지 않습니다.',
    }),
    ApiBody({
      type: UpsertUpbitCredentialDto,
      description:
        '업비트 API key 정보입니다. 현재 단계에서는 자산조회 권한만 가진 key 사용을 권장합니다.',
    }),
    ApiOkResponse({
      description: '업비트 API 키 등록 또는 수정 성공',
      schema: {
        example: {
          connected: true,
          updatedAt: '2026-06-22T10:00:00.000Z',
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        '요청 값이 유효하지 않거나 저장된 credential 암호화 형식이 올바르지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiGetUpbitCredentialStatus() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '업비트 API 키 등록 상태 조회',
      description:
        '로그인 사용자의 업비트 API 키 등록 여부만 조회합니다. access key와 secret key 값은 반환하지 않습니다.',
    }),
    ApiOkResponse({
      description: '업비트 API 키 등록 상태 조회 성공',
      schema: {
        example: {
          connected: true,
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}
