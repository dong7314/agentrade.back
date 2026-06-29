import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { NewsArticle } from '../types/news-article.type';
import { NaverNewsSearchResponse } from '../types/naver-news-search.response.type';

@Injectable()
export class NewsDataService {
  constructor(private readonly configService: ConfigService) {}

  async search(input: {
    query: string;
    display: number;
  }): Promise<NewsArticle[]> {
    const timeoutMs = this.configService.getOrThrow<number>(
      'DATA_COLLECT_TIMEOUT_MS',
    );
    const clientId = this.configService.getOrThrow<string>(
      'NAVER_SEARCH_CLIENT_ID',
    );
    const clientSecret = this.configService.getOrThrow<string>(
      'NAVER_SEARCH_CLIENT_SECRET',
    );

    const url = new URL('https://openapi.naver.com/v1/search/news.json');

    url.searchParams.set('query', input.query);
    url.searchParams.set('display', String(input.display));
    url.searchParams.set('sort', 'date');

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new BadGatewayException(
          '네이버 뉴스 검색 API 호출에 실패했습니다.',
        );
      }

      const data = (await response.json()) as NaverNewsSearchResponse;

      return data.items.map((item) => ({
        title: this.stripHtml(item.title),
        link: item.originallink || item.link,
        source: 'naver',
        publishedAt: this.parsePubDate(item.pubDate),
        description: this.stripHtml(item.description),
      }));
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ServiceUnavailableException(
          '네이버 뉴스 검색 API 요청 시간이 초과되었습니다.',
        );
      }

      throw error;
    }
  }

  // html을 파싱
  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  // date 변환
  private parsePubDate(value: string): Date | null {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }
}
