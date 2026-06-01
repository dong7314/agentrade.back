import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { AuthProvider } from '@/common/enums/auth-provider.enum';
import { SocialAccountEntity } from '../entities/social-account.entity';

@Injectable()
export class SocialAccountService {
  constructor(
    @InjectRepository(SocialAccountEntity)
    private readonly socialAccountRepository: Repository<SocialAccountEntity>,
  ) {}

  // provider 및 provider id를 통해서 social account 조회
  async findByProviderAndProviderUserId(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<SocialAccountEntity | null> {
    const user = await this.socialAccountRepository.findOneBy({
      provider,
      providerUserId,
    });

    return user;
  }

  // user 정보가 포함된 social account
  async findByProviderAndProviderUserIdWithUser(
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<SocialAccountEntity | null> {
    return this.socialAccountRepository.findOne({
      where: {
        provider,
        providerUserId,
      },
      relations: {
        user: true,
      },
    });
  }

  // social account 생성
  create(input: {
    userId: number;
    provider: AuthProvider;
    providerUserId: string;
    email: string;
    displayName: string | null;
  }) {
    const socialAccount = this.socialAccountRepository.create({
      userId: input.userId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      email: input.email,
      displayName: input.displayName,
    });

    return this.socialAccountRepository.save(socialAccount);
  }
}
