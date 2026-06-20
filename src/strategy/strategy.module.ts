import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LlmModule } from '@/llm/llm.module';
import { UserModule } from '@/user/user.module';

import { StrategyService } from './services/strategy.service';
import { StrategyParseService } from './services/strategy-parse.service';

import { StrategyController } from './controllers/strategy.controller';

import { StrategyEntity } from './entities/strategy.entity';
import { StrategyRunEntity } from './entities/strategy-run.entity';
import { StrategyRunService } from './services/strategy-run.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StrategyEntity, StrategyRunEntity]),
    UserModule,
    LlmModule,
  ],
  controllers: [StrategyController],
  providers: [StrategyService, StrategyParseService, StrategyRunService],
})
export class StrategyModule {}
