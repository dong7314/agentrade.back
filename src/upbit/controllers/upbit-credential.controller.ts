import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UpbitAuthService } from '../services/upbit.auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UpsertUpbitCredentialDto } from '../dto/upsert-upbit-credential.dto';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import {
  ApiGetUpbitCredentialStatus,
  ApiUpsertUpbitCredential,
} from '../docs/upbit-credential-api.docs';

@ApiTags('Upbit')
@Controller('upbit/credential')
export class UpbitCredentialController {
  constructor(private readonly upbitAuthService: UpbitAuthService) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiUpsertUpbitCredential()
  async upsertCredential(
    @Body() dto: UpsertUpbitCredentialDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ connected: boolean; updatedAt: Date }> {
    const credential = await this.upbitAuthService.upsertCredential({
      userId: user.id,
      accessKey: dto.accessKey,
      secretKey: dto.secretKey,
    });

    return {
      connected: true,
      updatedAt: credential.updatedAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiGetUpbitCredentialStatus()
  async getCredentialStatus(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ connected: boolean }> {
    const connected = await this.upbitAuthService.hasCredential(user.id);

    return { connected };
  }
}
