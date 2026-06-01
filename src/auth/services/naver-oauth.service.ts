import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { SocialAccountService } from './social-account.service';

import { AuthProvider } from '@/common/enums/auth-provider.enum';
import { LoginResultDto } from '../dto/login.result.dto';
import {
  isNaverTokenResponse,
  NaverTokenResponse,
} from '../types/naver/naver-token.response.type';
import {
  isNaverProfileResponse,
  NaverProfileResponse,
} from '../types/naver/naver-profile.response.type';

@Injectable()
export class NaverOauthService {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly socialAccountService: SocialAccountService,
  ) {}

  // 네이버로 로그인 진행
  async loginWithNaver(code: string, state: string): Promise<LoginResultDto> {
    const naverToken = await this.exchangeNaverCodeForToken(code, state);
    const naverProfile = await this.fetchNaverProfile(naverToken.access_token);

    const socialAccount =
      await this.socialAccountService.findByProviderAndProviderUserIdWithUser(
        AuthProvider.NAVER,
        naverProfile.id,
      );
    // 소셜 로그인 사용자가 존재할 경우 로그인 처리 진행
    if (socialAccount) {
      return this.authService.createLoginResult(socialAccount.user);
    }

    if (!naverProfile.email) {
      throw new UnauthorizedException('네이버 이메일 제공 동의가 필요합니다.');
    }

    const user = await this.authService.findOrCreateUserForSocialLogin({
      provider: AuthProvider.NAVER,
      providerUserId: naverProfile.id,
      email: naverProfile.email,
      name: naverProfile.name ?? '네이버 사용자',
      displayName: naverProfile.name ?? null,
    });

    return this.authService.createLoginResult(user);
  }

  // 네이버 로그인 redirect url 생성 메서드
  createNaverAuthorizationUrl(state: string) {
    const url = new URL('https://nid.naver.com/oauth2.0/authorize');

    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'client_id',
      this.configService.getOrThrow<string>('NAVER_CLIENT_ID'),
    );
    url.searchParams.set(
      'redirect_uri',
      this.configService.getOrThrow<string>('NAVER_CALLBACK_URL'),
    );
    url.searchParams.set('state', state);

    return url.toString();
  }

  // 네이버 코드를 통해 토큰으로 발급
  private async exchangeNaverCodeForToken(
    code: string,
    state: string,
  ): Promise<NaverTokenResponse> {
    const url = new URL('https://nid.naver.com/oauth2.0/token');

    url.searchParams.set('grant_type', 'authorization_code');
    url.searchParams.set(
      'client_id',
      this.configService.getOrThrow<string>('NAVER_CLIENT_ID'),
    );
    url.searchParams.set(
      'client_secret',
      this.configService.getOrThrow<string>('NAVER_CLIENT_SECRET'),
    );
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);

    const response = await fetch(url);
    const data = (await response.json()) as unknown;

    if (!response.ok || !isNaverTokenResponse(data)) {
      throw new UnauthorizedException('네이버 토큰 발급에 실패했습니다.');
    }

    return data;
  }

  // 네이버에서 발급받은 토큰을 통해 프로필 조회
  private async fetchNaverProfile(
    accessToken: string,
  ): Promise<NaverProfileResponse['response']> {
    const response = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as unknown;

    if (!response.ok || !isNaverProfileResponse(data)) {
      throw new UnauthorizedException('네이버 프로필 조회에 실패했습니다.');
    }

    return data.response;
  }
}
