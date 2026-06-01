// src/auth/docs/auth-api.docs.ts
import { applyDecorators } from '@nestjs/common';
import {
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserResponseDto } from '@/user/dto/user.response.dto';

export function ApiLocalRegister() {
  return applyDecorators(
    ApiOperation({
      summary: '로컬 회원가입',
      description: '이메일, 비밀번호, 이름으로 일반 사용자 계정을 생성합니다.',
    }),
    ApiCreatedResponse({
      description: '회원가입 성공',
      type: UserResponseDto,
    }),
    ApiConflictResponse({
      description: '이미 가입된 이메일입니다.',
    }),
    ApiBadRequestResponse({
      description: '요청 값이 유효하지 않습니다.',
    }),
  );
}

export function ApiLocalLogin() {
  return applyDecorators(
    ApiOperation({
      summary: '로컬 로그인',
      description: '이메일, 비밀번호를 통해 사용자 로그인을 진행합니다.',
    }),
    ApiOkResponse({
      description: '로그인 성공',
      type: UserResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: '사용자 정보가 정확하지 않습니다.',
    }),
    ApiBadRequestResponse({
      description: '요청 값이 유효하지 않습니다.',
    }),
  );
}

export function ApiRefreshToken() {
  return applyDecorators(
    ApiCookieAuth('refresh_token'),
    ApiOperation({
      summary: '토큰 재발급',
      description:
        'HttpOnly refresh_token 쿠키를 검증하고, 새로운 access_token과 refresh_token 쿠키를 발급합니다.',
    }),
    ApiOkResponse({
      description: '토큰 재발급 성공',
      type: UserResponseDto,
    }),
    ApiUnauthorizedResponse({
      description:
        'refresh_token 쿠키가 없거나, 만료되었거나, 저장된 세션 정보와 일치하지 않습니다.',
    }),
  );
}

export function ApiMe() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '내 정보 조회',
      description:
        'access_token 쿠키를 검증하고 현재 로그인 사용자를 조회합니다.',
    }),
    ApiOkResponse({
      description: '내 정보 조회 성공',
      type: UserResponseDto,
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
  );
}

export function ApiLogout() {
  return applyDecorators(
    ApiCookieAuth('refresh_token'),
    ApiOperation({
      summary: '로그아웃',
      description:
        'refresh_token 쿠키가 있으면 해당 세션을 만료 처리하고 인증 쿠키를 제거합니다.',
    }),
    ApiOkResponse({
      description: '로그아웃 성공',
      schema: {
        example: { success: true },
      },
    }),
  );
}

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

export function ApiRedirectKakao() {
  return applyDecorators(
    ApiOperation({
      summary: '카카오 리다이렉트',
      description:
        '카카오 로그인을 위해 CSRF 방지 state 쿠키를 저장하고 카카오 인증 페이지로 리다이렉트합니다.',
    }),
    ApiResponse({
      status: 302,
      description: '카카오 인증 페이지로 리다이렉트합니다.',
    }),
  );
}

export function ApiKakaoCallback() {
  return applyDecorators(
    ApiOperation({
      summary: '카카오 로그인 콜백',
      description:
        '카카오 OAuth 콜백의 code/state를 검증하고, 성공 시 서비스 인증 쿠키를 발급한 뒤 프론트엔드로 리다이렉트합니다.',
    }),
    ApiQuery({
      name: 'code',
      required: true,
      description: '카카오 OAuth authorization code',
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
        'state가 일치하지 않거나, 카카오 토큰/프로필 조회 또는 이메일 동의 검증에 실패했습니다.',
    }),
  );
}
