import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthService } from './services/auth.service';
import { KakaoOauthService } from './services/kakao-oauth.service';
import { NaverOauthService } from './services/naver-oauth.service';
import { AuthSessionService } from './services/auth-session.service';
import { SocialAccountService } from './services/social-account.service';

import { AuthController } from './controllers/auth.controller';

import { AuthSessionEntity } from './entities/auth-session.entity';
import { SocialAccountEntity } from './entities/social-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSessionEntity, SocialAccountEntity]),
    JwtModule.register({}),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthService,
    KakaoOauthService,
    NaverOauthService,
    AuthSessionService,
    SocialAccountService,
  ],
})
export class AuthModule {}
