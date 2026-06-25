import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UpbitModule } from '@/upbit/upbit.module';

import { PaperAccountEntity } from './entities/paper-account.entity';
import { PaperPositionEntity } from './entities/paper-position.entity';

import { PaperOrderService } from './services/paper-order.service';
import { PaperPortfolioService } from './services/paper-portfolio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaperAccountEntity, PaperPositionEntity]),
    UpbitModule,
  ],
  providers: [PaperPortfolioService, PaperOrderService],
  exports: [PaperPortfolioService, PaperOrderService],
})
export class PaperTradingModule {}
