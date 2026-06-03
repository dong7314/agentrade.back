import { PaginatedMeta } from '../types/paginated.type';

export function createPaginationMeta(input: {
  page: number;
  limit: number;
  total: number;
}): PaginatedMeta {
  const totalPages = Math.max(1, Math.ceil(input.total / input.limit));

  return {
    page: input.page,
    limit: input.limit,
    total: input.total,
    totalPages,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}
