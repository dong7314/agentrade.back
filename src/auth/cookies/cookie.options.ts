import type { CookieOptions } from 'express';

export function createAccessCookieOptions(
  ttlSeconds: number,
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: ttlSeconds * 1000,
  };
}

export function createRefreshCookieOptions(
  ttlSeconds: number,
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/auth',
    maxAge: ttlSeconds * 1000,
  };
}

export function createAccessClearCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function createRefreshClearCookieOptions(
  isProduction: boolean,
): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/auth',
  };
}
