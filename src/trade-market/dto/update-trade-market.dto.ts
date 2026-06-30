import { PartialType } from '@nestjs/swagger';

import { CreateTradeMarketDto } from './create-trade-market.dto';

export class UpdateTradeMarketDto extends PartialType(CreateTradeMarketDto) {}
