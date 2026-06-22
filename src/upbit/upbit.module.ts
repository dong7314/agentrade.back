import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UpbitAuthService } from './services/upbit.auth.service';
import { UpbitPublicService } from './services/upbit.public.service';
import { UpbitPrivateService } from './services/upbit.private.service';

import { UpbitCredentialController } from './controllers/upbit-credential.controller';

import { UpbitCredentialEntity } from './entities/upbit-credential.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UpbitCredentialEntity])],
  controllers: [UpbitCredentialController],
  providers: [UpbitPublicService, UpbitAuthService, UpbitPrivateService],
  exports: [UpbitPublicService, UpbitPrivateService, UpbitAuthService],
})
export class UpbitModule {}
