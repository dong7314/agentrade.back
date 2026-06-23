import { Module } from '@nestjs/common';

import { NewsDataService } from './services/news-data.service';

@Module({
  providers: [NewsDataService],
  exports: [NewsDataService],
})
export class NewsModule {}
