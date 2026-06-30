import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminGuard } from '@/auth/guards/admin.guard';

import { TradeMarketController } from './controllers/trade-market.controller';

import { TradeMarketService } from './services/trade-market.service';

import { TradeMarketEntity } from './entities/trade-market.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TradeMarketEntity])],
  controllers: [TradeMarketController],
  providers: [TradeMarketService, AdminGuard],
  exports: [TradeMarketService],
})
export class TradeMarketModule {}
