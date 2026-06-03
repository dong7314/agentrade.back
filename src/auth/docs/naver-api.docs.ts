import { applyDecorators } from '@nestjs/common';
import {
  ApiQuery,
  ApiResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiRedirectNaver() {
  return applyDecorators(
    ApiOperation({
      summary: '네이버 리다이렉트',
      description:
        '네이버 로그인을 위해 CSRF 방지 state 쿠키를 저장하고 네이버 인증 페이지로 리다이렉트합니다.',
    }),
    ApiResponse({
      status: 302,
      description: '네이버 인증 페이지로 리다이렉트합니다.',
    }),
  );
}

export function ApiNaverCallback() {
  return applyDecorators(
    ApiOperation({
      summary: '네이버 로그인 콜백',
      description:
        '네이버 OAuth 콜백의 code/state를 검증하고, 성공 시 서비스 인증 쿠키를 발급한 뒤 프론트엔드로 리다이렉트합니다.',
    }),
    ApiQuery({
      name: 'code',
      required: true,
      description: '네이버 OAuth authorization code',
      example: 'abc123',
    }),
    ApiQuery({
      name: 'state',
      required: true,
      description: 'CSRF 방지를 위해 발급한 OAuth state',
      example: 'random-state',
    }),
    ApiResponse({
      status: 302,
      description: '서비스 인증 쿠키를 발급하고 프론트엔드로 리다이렉트합니다.',
    }),
    ApiUnauthorizedResponse({
      description:
        'state가 일치하지 않거나, 네이버 토큰/프로필 조회 또는 이메일 동의 검증에 실패했습니다.',
    }),
  );
}
