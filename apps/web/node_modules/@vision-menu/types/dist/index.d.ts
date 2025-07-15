export * from "./restaurant";
export * from "./menu";
export * from "./order";
export * from "./auth";
export interface ApiResponse<T = any> {
    data: T;
    success: boolean;
    message?: string;
    error?: string;
}
export interface PaginatedResponse<T = any> {
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
    details?: Record<string, any>;
    status_code: number;
}
export type SortOrder = "asc" | "desc";
export interface SortOptions {
    field: string;
    order: SortOrder;
}
export interface FilterOptions {
    [key: string]: any;
}
export interface QueryOptions {
    page?: number;
    per_page?: number;
    sort?: SortOptions;
    filters?: FilterOptions;
    search?: string;
}
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type ISODateString = string;
export type TimestampString = string;
export type UUID = string;
export type EntityID = string;
export type Environment = "development" | "staging" | "production";
export type Status = "active" | "inactive" | "pending" | "archived";
export interface FileUpload {
    file: any;
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
//# sourceMappingURL=index.d.ts.map