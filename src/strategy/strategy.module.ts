import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@/user/user.module';

import { StrategyService } from './services/strategy.service';
import { StrategyParseService } from './services/strategy-parse.service';

import { StrategyController } from './controllers/strategy.controller';

import { StrategyEntity } from './entities/strategy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StrategyEntity]), UserModule],
  controllers: [StrategyController],
  providers: [StrategyService, StrategyParseService],
})
export class StrategyModule {}
