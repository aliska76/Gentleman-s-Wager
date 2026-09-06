/** Mirrors backend-api's UserProfile (src/domain/entities.ts). */
export interface UserProfile {
  id: string;
  username: string;
  wins: number;
  avatarId: number;
  isBot: boolean;
}

/** Mirrors backend-api's PaginationMeta/PaginatedResult (src/domain/entities.ts). */
export interface PaginationMeta {
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
