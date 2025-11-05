// Restaurant Types
export * from "./restaurant";

// Menu Types
export * from "./menu";

// Order Types
export * from "./order";

// Auth Types
export * from "./auth";

// Campaign Types
export * from "./campaign";

// Daily Closing Types
export * from "./daily-closing";

// Common Types
export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status_code: number;
}

export type SortOrder = "asc" | "desc";

export interface SortOptions {
  field: string;
  order: SortOrder;
}

export interface FilterOptions {
  [key: string]: unknown;
}

export interface QueryOptions {
  page?: number;
  per_page?: number;
  sort?: SortOptions;
  filters?: FilterOptions;
  search?: string;
}

// Utility Types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Date/Time Types
export type ISODateString = string;
export type TimestampString = string;

// ID Types
export type UUID = string;
export type EntityID = string;

// Environment Types
export type Environment = "development" | "staging" | "production";

// Status Types
export type Status = "active" | "inactive" | "pending" | "archived";

// File Upload Types
export interface FileUpload {
  file: File; // File type for browser environments
  key: string;
  url?: string;
  progress?: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export interface UploadedFile {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  key: string;
  created_at: string;
}
