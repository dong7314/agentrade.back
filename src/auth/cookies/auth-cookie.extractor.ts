import type { Request } from 'express';

function getCookieValue(request: Request, name: string): string | null {
  const cookies: unknown = request.cookies;

  if (!cookies || typeof cookies !== 'object') {
    return null;
  }

  const value = (cookies as Record<string, unknown>)[name];

  return typeof value === 'string' ? value : null;
}

export function extractAccessTokenFromCookie(request: Request): string | null {
  return getCookieValue(request, 'access_token');
}

export function extractRefreshTokenFromCookie(request: Request): string | null {
  return getCookieValue(request, 'refresh_token');
}

export function extractNaverOAuthStateFromCookie(
  request: Request,
): string | null {
  return getCookieValue(request, 'naver_oauth_state');
}

export function extractKakaoOAuthStateFromCookie(
  request: Request,
): string | null {
  return getCookieValue(request, 'kakao_oauth_state');
}
