import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaperTradingModule } from '@/paper-trading/paper-trading.module';

import { UserService } from './services/user.service';

import { UserController } from './controllers/user.controller';
import { AdminUserController } from './controllers/admin-user.controller';

import { AdminGuard } from '@/auth/guards/admin.guard';

import { UserEntity } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), PaperTradingModule],
  exports: [UserService],
  controllers: [UserController, AdminUserController],
  providers: [UserService, AdminGuard],
})
export class UserModule {}
