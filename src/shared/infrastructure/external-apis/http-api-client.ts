import axios, { type AxiosInstance } from 'axios';
import { type ExternalApiClient, type ExternalApiConfig } from './api-client.interface';

export class HttpApiClient implements ExternalApiClient {
  private client: AxiosInstance;

  constructor(private config: ExternalApiConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (process.env.LOG_HTTP !== 'false') {
          console.log(`🌐 External API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
        return config;
      },
      (error) => {
        if (process.env.LOG_HTTP !== 'false') {
          console.error('🚨 External API Request Error:', error);
        }
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (process.env.NODE_ENV !== 'test' && process.env.LOG_HTTP !== 'false') {
          console.log(`✅ External API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      (error) => {
        if (process.env.NODE_ENV !== 'test' && process.env.LOG_HTTP !== 'false') {
          console.error('🚨 External API Response Error:', error);
        }
        return Promise.reject(error);
      },
    );
  }

  public async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  public async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  public async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  public async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}
