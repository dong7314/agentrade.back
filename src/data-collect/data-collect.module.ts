import { Module } from '@nestjs/common';

import { NewsDataService } from './services/news-data.service';
import { AssetSummaryService } from './services/asset-summary.service';

@Module({
  providers: [NewsDataService, AssetSummaryService],
  exports: [NewsDataService, AssetSummaryService],
})
export class DataCollectModule {}
