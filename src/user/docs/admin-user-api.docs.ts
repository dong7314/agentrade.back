import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserRole } from '@/common/enums/user-role.enum';

import { AdminUserResponseDto } from '../dto/admin-user-response.dto';
import { UpdateUserPermissionsDto } from '../dto/update-user-permissions.dto';

const adminUserExample = {
  id: 1,
  email: 'kim@example.com',
  name: '김투자',
  role: UserRole.USER,
  provider: 'local',
  paperTradingEnabled: true,
  liveTradingEnabled: false,
  createdAt: '2026-06-30T01:00:00.000Z',
  updatedAt: '2026-06-30T01:00:00.000Z',
};

export function ApiGetAdminUsers() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 사용자 목록 조회',
      description:
        '관리자가 사용자 목록을 페이지네이션으로 조회합니다. email/name 검색, role, paper/live trading 권한 필터를 지원합니다.',
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
      description: '페이지당 항목 수입니다.',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      example: 'kim',
      description: 'email 또는 name 검색어입니다.',
    }),
    ApiQuery({
      name: 'role',
      required: false,
      enum: UserRole,
      example: UserRole.USER,
      description: '사용자 role 필터입니다.',
    }),
    ApiQuery({
      name: 'paperTradingEnabled',
      required: false,
      example: 'true',
      description: 'paper trading 권한 여부 필터입니다. true 또는 false',
    }),
    ApiQuery({
      name: 'liveTradingEnabled',
      required: false,
      example: 'false',
      description: 'live trading 권한 여부 필터입니다. true 또는 false',
    }),
    ApiOkResponse({
      description: '관리자 사용자 목록 조회 성공',
      schema: {
        example: {
          items: [adminUserExample],
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
        'page, limit, search, role, paperTradingEnabled, liveTradingEnabled query 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
  );
}

export function ApiGetAdminUser() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 사용자 상세 조회',
      description:
        '관리자가 특정 사용자의 role, provider, paper/live trading 권한 상태를 조회합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '조회할 사용자 ID입니다.',
    }),
    ApiOkResponse({
      description: '관리자 사용자 상세 조회 성공',
      type: AdminUserResponseDto,
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
      description: '사용자를 찾을 수 없습니다.',
    }),
  );
}

export function ApiUpdateUserPermissions() {
  return applyDecorators(
    ApiCookieAuth('access_token'),
    ApiOperation({
      summary: '관리자 사용자 권한 수정',
      description:
        '관리자가 사용자의 paper trading 권한, live trading 권한, role을 부분 수정합니다.',
    }),
    ApiParam({
      name: 'id',
      example: 1,
      description: '권한을 수정할 사용자 ID입니다.',
    }),
    ApiBody({
      type: UpdateUserPermissionsDto,
      description:
        '수정할 권한 값입니다. 필요한 필드만 전달하면 기존 값은 유지됩니다.',
    }),
    ApiOkResponse({
      description: '관리자 사용자 권한 수정 성공',
      type: AdminUserResponseDto,
    }),
    ApiBadRequestResponse({
      description: 'id path parameter 또는 요청 body 값이 유효하지 않습니다.',
    }),
    ApiUnauthorizedResponse({
      description: 'access_token 쿠키가 없거나 유효하지 않습니다.',
    }),
    ApiForbiddenResponse({
      description: '관리자 권한이 없습니다.',
    }),
    ApiNotFoundResponse({
      description: '사용자를 찾을 수 없습니다.',
    }),
  );
}
