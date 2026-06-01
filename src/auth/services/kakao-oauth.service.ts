import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { SocialAccountService } from './social-account.service';

import { AuthProvider } from '@/common/enums/auth-provider.enum';
import { LoginResultDto } from '../dto/login.result.dto';
import {
  isKakaoTokenResponse,
  KakaoTokenResponse,
} from '../types/kakao/kakao-token.response.type';
import {
  isKakaoProfileResponse,
  KakaoProfileResponse,
} from '../types/kakao/kakao-profile.response.type';

@Injectable()
export class KakaoOauthService {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly socialAccountService: SocialAccountService,
  ) {}

  // 카카오 로그인 진행
  async loginWithKakao(code: string): Promise<LoginResultDto> {
    const kakaoToken = await this.exchangeKakaoCodeForToken(code);
    const kakaoProfile = await this.fetchKakaoProfile(kakaoToken.access_token);

    const providerUserId = String(kakaoProfile.id);
    const kakaoAccount = kakaoProfile.kakao_account;
    const email = kakaoAccount?.email;
    const nickname = kakaoAccount?.profile?.nickname;

    const socialAccount =
      await this.socialAccountService.findByProviderAndProviderUserIdWithUser(
        AuthProvider.KAKAO,
        providerUserId,
      );

    if (socialAccount) {
      return this.authService.createLoginResult(socialAccount.user);
    }

    if (
      !email ||
      kakaoAccount?.is_email_valid !== true ||
      kakaoAccount?.is_email_verified !== true
    ) {
      throw new UnauthorizedException('카카오 이메일 제공 동의가 필요합니다.');
    }

    const user = await this.authService.findOrCreateUserForSocialLogin({
      provider: AuthProvider.KAKAO,
      providerUserId,
      email,
      name: nickname ?? '카카오 사용자',
      displayName: nickname ?? null,
    });

    return this.authService.createLoginResult(user);
  }

  // 카카오 로그인 redirect url 생성 메서드
  createKakaoAuthorizationUrl(state: string): string {
    const url = new URL('https://kauth.kakao.com/oauth/authorize');

    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'client_id',
      this.configService.getOrThrow<string>('KAKAO_REST_API_KEY'),
    );
    url.searchParams.set(
      'redirect_uri',
      this.configService.getOrThrow<string>('KAKAO_CALLBACK_URL'),
    );
    url.searchParams.set('state', state);

    return url.toString();
  }

  // 카카오 code 값을 통해서 토큰 교환 진행
  private async exchangeKakaoCodeForToken(
    code: string,
  ): Promise<KakaoTokenResponse> {
    const body = new URLSearchParams();

    body.set('grant_type', 'authorization_code');
    body.set(
      'client_id',
      this.configService.getOrThrow<string>('KAKAO_REST_API_KEY'),
    );
    body.set(
      'redirect_uri',
      this.configService.getOrThrow<string>('KAKAO_CALLBACK_URL'),
    );
    body.set('code', code);
    body.set(
      'client_secret',
      this.configService.getOrThrow<string>('KAKAO_CLIENT_SECRET'),
    );

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body,
    });

    const data = (await response.json()) as unknown;

    if (!response.ok || !isKakaoTokenResponse(data)) {
      throw new UnauthorizedException('카카오 토큰 발급에 실패했습니다.');
    }

    return data;
  }

  // 토큰을 통해 카카오 프로필 조회
  private async fetchKakaoProfile(
    accessToken: string,
  ): Promise<KakaoProfileResponse> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = (await response.json()) as unknown;

    if (!response.ok || !isKakaoProfileResponse(data)) {
      throw new UnauthorizedException('카카오 프로필 조회에 실패했습니다.');
    }

    return data;
  }
}
