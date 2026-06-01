import {
  Res,
  Req,
  Get,
  Body,
  Post,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
  Query,
  UnauthorizedException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

import {
  ApiMe,
  ApiLogout,
  ApiLocalLogin,
  ApiRefreshToken,
  ApiLocalRegister,
  ApiKakaoCallback,
  ApiRedirectKakao,
  ApiNaverCallback,
  ApiRedirectNaver,
} from '../docs/auth-api.docs';
import {
  createAccessClearCookieOptions,
  createAccessCookieOptions,
  createRefreshClearCookieOptions,
  createRefreshCookieOptions,
} from '../cookies/cookie.options';
import {
  extractKakaoOAuthStateFromCookie,
  extractNaverOAuthStateFromCookie,
  extractRefreshTokenFromCookie,
} from '../cookies/auth-cookie.extractor';

import { AuthService } from '../services/auth.service';
import { ConfigService } from '@nestjs/config';
import { NaverOauthService } from '../services/naver-oauth.service';
import { KakaoOauthService } from '../services/kakao-oauth.service';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { CurrentUser } from '../decorators/current-user.decorator';

import { LocalLoginDto } from '../dto/login.dto';
import { UserResponseDto } from '@/user/dto/user.response.dto';
import { LocalRegisterDto } from '../dto/register.dto';
import { OAuthCallbackQueryDto } from '../dto/oauth-callback-query.dto';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly kakaoOauthService: KakaoOauthService,
    private readonly naverOauthService: NaverOauthService,
  ) {}

  // 사용자 등록
  @Post('register')
  @ApiLocalRegister()
  register(@Body() dto: LocalRegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  // 사용자 로그인
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLocalLogin()
  async login(
    @Body() dto: LocalLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const result = await this.authService.login(dto);

    this.setAuthCookies(response, result);

    return result.user;
  }

  @Post('logout')
  @ApiLogout()
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = extractRefreshTokenFromCookie(request);

    await this.authService.logout(refreshToken);

    this.clearAuthCookies(response);

    return { success: true };
  }

  // 사용자 로그인 여부 체크
  @Get('me')
  @ApiMe()
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.authService.me(user.id);
  }

  // refresh 토큰 체크
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiRefreshToken()
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponseDto> {
    const refreshToken = extractRefreshTokenFromCookie(request);
    const result = await this.authService.refresh(refreshToken);

    this.setAuthCookies(response, result);

    return result.user;
  }

  // 네이버 로그인 리다이렉트
  @Get('naver')
  @ApiRedirectNaver()
  redirectNaver(@Res() response: Response): void {
    const state = randomUUID();
    const redirectUrl =
      this.naverOauthService.createNaverAuthorizationUrl(state);

    response.cookie('naver_oauth_state', state, {
      httpOnly: true,
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/naver/callback',
      maxAge: 1000 * 60 * 5,
    });

    response.redirect(302, redirectUrl);
  }

  @Get('naver/callback')
  @ApiNaverCallback()
  async handleNaverCallback(
    @Query() query: OAuthCallbackQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const savedState = extractNaverOAuthStateFromCookie(request);
    // 헤더에 존재하는 쿠키 제거
    response.clearCookie('naver_oauth_state', {
      httpOnly: true,
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/naver/callback',
    });

    if (!savedState || savedState !== query.state) {
      throw new UnauthorizedException(
        '네이버 로그인 요청이 유효하지 않습니다.',
      );
    }

    // 네이버 로그인 시도 진행
    const result = await this.naverOauthService.loginWithNaver(
      query.code,
      query.state,
    );

    this.setAuthCookies(response, result);

    response.redirect(
      302,
      this.configService.getOrThrow<string>('FRONTEND_AUTH_REDIRECT_URL'),
    );
  }

  // 카카오 로그인 리다이렉트
  @Get('kakao')
  @ApiRedirectKakao()
  redirectKakao(@Res() response: Response): void {
    const state = randomUUID();
    const redirectUrl =
      this.kakaoOauthService.createKakaoAuthorizationUrl(state);

    response.cookie('kakao_oauth_state', state, {
      httpOnly: true,
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/kakao/callback',
      maxAge: 1000 * 60 * 5,
    });

    response.redirect(302, redirectUrl);
  }

  @Get('kakao/callback')
  @ApiKakaoCallback()
  async handleKakaoCallback(
    @Query() query: OAuthCallbackQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const savedState = extractKakaoOAuthStateFromCookie(request);

    response.clearCookie('kakao_oauth_state', {
      httpOnly: true,
      secure:
        this.configService.getOrThrow<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/kakao/callback',
    });

    if (!savedState || savedState !== query.state) {
      throw new UnauthorizedException(
        '카카오 로그인 요청이 유효하지 않습니다.',
      );
    }

    const result = await this.kakaoOauthService.loginWithKakao(query.code);

    this.setAuthCookies(response, result);

    response.redirect(
      302,
      this.configService.getOrThrow<string>('FRONTEND_AUTH_REDIRECT_URL'),
    );
  }

  // 쿠기 옵션 값 설정 후 response에 세팅
  private setAuthCookies(
    response: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
    },
  ): void {
    const accessTtlSeconds = this.configService.getOrThrow<number>(
      'JWT_ACCESS_TTL_SECONDS',
    );
    const refreshTtlSeconds = this.configService.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );
    const isProduction =
      this.configService.getOrThrow<string>('NODE_ENV') === 'production';

    response.cookie(
      'access_token',
      tokens.accessToken,
      createAccessCookieOptions(accessTtlSeconds, isProduction),
    );

    response.cookie(
      'refresh_token',
      tokens.refreshToken,
      createRefreshCookieOptions(refreshTtlSeconds, isProduction),
    );
  }

  // 쿠키 제거 후 response 세팅
  private clearAuthCookies(response: Response): void {
    const isProduction =
      this.configService.getOrThrow<string>('NODE_ENV') === 'production';

    response.clearCookie(
      'access_token',
      createAccessClearCookieOptions(isProduction),
    );

    response.clearCookie(
      'refresh_token',
      createRefreshClearCookieOptions(isProduction),
    );
  }
}
