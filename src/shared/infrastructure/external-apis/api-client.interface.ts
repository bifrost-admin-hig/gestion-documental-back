export interface ExternalApiClient {
  get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T>;
  post<T>(endpoint: string, data?: unknown): Promise<T>;
  put<T>(endpoint: string, data?: unknown): Promise<T>;
  delete<T>(endpoint: string): Promise<T>;
}

export interface ExternalApiConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retries?: number;
}
