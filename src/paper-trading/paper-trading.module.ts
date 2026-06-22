import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaperAccountEntity } from './entities/paper-account.entity';
import { PaperPositionEntity } from './entities/paper-position.entity';

import { PaperPortfolioService } from './services/paper-portfolio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaperAccountEntity, PaperPositionEntity]),
  ],
  providers: [PaperPortfolioService],
  exports: [PaperPortfolioService],
})
export class PaperTradingModule {}
