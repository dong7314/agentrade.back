import { BadGatewayException, Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { UpbitAuthService } from './upbit.auth.service';

import { UpbitBalance } from '../types/private/upbit-balance.type';
import { UpbitAccountResponse } from '../types/private/upbit-account.response.type';

@Injectable()
export class UpbitPrivateService {
  constructor(
    private readonly configService: ConfigService,
    private readonly upbitAuthService: UpbitAuthService,
  ) {}

  // 계정 상세 정보를 가져오는 메서드
  async getAccounts(input: {
    accessKey: string;
    secretKey: string;
  }): Promise<UpbitBalance[]> {
    const baseUrl = this.configService.getOrThrow<string>('UPBIT_BASE_URL');
    const timeoutMs = this.configService.getOrThrow<number>('UPBIT_TIMEOUT_MS');

    const url = new URL('/v1/accounts', baseUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: this.upbitAuthService.createAuthorizationHeader({
            accessKey: input.accessKey,
            secretKey: input.secretKey,
          }),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new BadGatewayException(
          '업비트 계좌 조회 api 호출에 실패하였습니다.',
        );
      }

      const data = (await response.json()) as UpbitAccountResponse[];

      return data.map((item) => ({
        currency: item.currency,
        balance: Number(item.balance),
        locked: Number(item.locked),
        avgBuyPrice:
          item.avg_buy_price === '' ? null : Number(item.avg_buy_price),
        unitCurrency: item.unit_currency,
      }));
    } finally {
      clearTimeout(timeout);
    }
  }
}
