import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaperTradingModule } from '@/paper-trading/paper-trading.module';

import { UserService } from './services/user.service';

import { UserController } from './controllers/user.controller';

import { UserEntity } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), PaperTradingModule],
  exports: [UserService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
