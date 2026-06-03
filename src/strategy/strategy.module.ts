import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '@/user/user.module';

import { StrategyEntity } from './entities/strategy.entity';
import { StrategyService } from './services/strategy.service';
import { StrategyController } from './controllers/strategy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StrategyEntity]), UserModule],
  controllers: [StrategyController],
  providers: [StrategyService],
})
export class StrategyModule {}
