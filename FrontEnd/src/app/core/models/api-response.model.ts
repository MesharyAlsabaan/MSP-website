/** Standard envelope for a single resource response. */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Standard envelope for paginated list responses. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
