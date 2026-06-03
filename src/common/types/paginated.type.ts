export type PaginatedResult<T> = {
  items: T[];
  meta: PaginatedMeta;
};

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
