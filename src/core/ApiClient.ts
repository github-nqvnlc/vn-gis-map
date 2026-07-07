import type { FeatureCollection } from 'geojson';
import type {
  VNGeoJSONCollection,
  LookupResult,
  ApiEnvelope,
  ValidateResult,
  AuthUser,
  LoginResult,
} from '../types';
import { Cache } from '../utils/cache';

export interface ApiClientConfig {
  baseUrl: string;
  /**
   * JWT access token (Bearer). Bắt buộc nếu không cung cấp `username` + `password`.
   */
  token?: string;
  /**
   * Email đăng nhập. Khi cung cấp cùng `password` (không có `token`),
   * ApiClient tự động gọi `POST /v1/auth/login` để lấy token.
   */
  username?: string;
  /**
   * Mật khẩu. Bắt buộc nếu dùng `username`.
   */
  password?: string;
  /** Cache TTL giây (mặc định 600s = 10 phút) */
  cacheTtl?: number;
  /**
   * Format response của các endpoint `/v1/gis/*`.
   * - `raw` (mặc định): API trả về GeoJSON FeatureCollection trực tiếp.
   * - `envelope`: API wrap trong `{ data, meta }` (TransformInterceptor của NestJS).
   * - `auto`: tự nhận dạng dựa trên content-type / shape body.
   */
  responseFormat?: ResponseFormat;
}

export type ResponseFormat = 'raw' | 'envelope' | 'auto';

/**
 * Lỗi trả về từ API client
 */
export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type AnyResponse = VNGeoJSONCollection | LookupResult;

/**
 * HTTP client tích hợp với vn-gis-api
 * - Tự động thêm Bearer token vào header
 * - Cache kết quả GeoJSON theo TTL
 * - Hỗ trợ cả hai format response: raw GeoJSON hoặc envelope `{ data, meta }`
 * - Nếu không cung cấp `token` mà có `username` + `password`, tự động login
 */
export class ApiClient {
  private readonly baseUrl: string;
  private token: string = '';
  private readonly cache: Cache<AnyResponse>;
  private readonly cacheTtl: number;
  private readonly responseFormat: ResponseFormat;
  private readonly _username: string;
  private readonly _password: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.cacheTtl = config.cacheTtl ?? 600;
    this.responseFormat = config.responseFormat ?? 'raw';
    this._username = config.username ?? '';
    this._password = config.password ?? '';
    this.cache = new Cache<AnyResponse>(this.cacheTtl);

    if (config.token) {
      this.token = config.token;
    }
  }

  /**
   * Lấy GeoJSON toàn bộ tỉnh thành Việt Nam
   * Endpoint: GET /v1/gis/provinces
   */
  async getProvinces(): Promise<VNGeoJSONCollection> {
    await this.ensureToken();
    const cacheKey = 'gis:provinces';
    const cached = this.cache.get(cacheKey) as VNGeoJSONCollection | undefined;
    if (cached) return cached;

    const data = await this.request<VNGeoJSONCollection>('/v1/gis/provinces');
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Lấy GeoJSON xã/phường, có thể lọc theo tỉnh
   * Endpoint: GET /v1/gis/wards?provinceCode=<code>
   */
  async getWards(provinceCode?: string): Promise<VNGeoJSONCollection> {
    await this.ensureToken();
    const cacheKey = provinceCode ? `gis:wards:${provinceCode}` : 'gis:wards:all';
    const cached = this.cache.get(cacheKey) as VNGeoJSONCollection | undefined;
    if (cached) return cached;

    const params: Record<string, string> = provinceCode ? { provinceCode } : {};
    const data = await this.request<VNGeoJSONCollection>('/v1/gis/wards', params);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Reverse geocoding - tìm ward/province từ tọa độ
   * Endpoint: GET /v1/gis/lookup?lng=<lng>&lat=<lat>
   */
  async reverseGeocode(lng: number, lat: number): Promise<LookupResult> {
    await this.ensureToken();
    const cacheKey = `gis:lookup:${lng}:${lat}`;
    const cached = this.cache.get(cacheKey) as LookupResult | undefined;
    if (cached) return cached;

    const data = await this.request<LookupResult>('/v1/gis/lookup', {
      lng: String(lng),
      lat: String(lat),
    });
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Fetch custom GeoJSON từ URL bất kỳ (không cần auth).
   * Response bắt buộc là FeatureCollection; nếu khác sẽ throw.
   */
  async fetchGeoJSON(url: string): Promise<VNGeoJSONCollection> {
    const cacheKey = `custom:${url}`;
    const cached = this.cache.get(cacheKey) as VNGeoJSONCollection | undefined;
    if (cached) return cached;

    const response = await fetch(url, {
      headers: { Accept: 'application/geo+json, application/json' },
    });
    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        `Failed to fetch GeoJSON from ${url}: ${response.statusText}`,
      );
    }
    const data = (await response.json()) as unknown;
    const collection = this.unwrap(data, 'raw') as VNGeoJSONCollection;
    if (!this.isFeatureCollection(collection)) {
      throw new ApiClientError(0, `URL ${url} did not return a valid GeoJSON FeatureCollection`);
    }
    this.cache.set(cacheKey, collection, this.cacheTtl);
    return collection;
  }

  /**
   * Đăng nhập bằng username + password để lấy JWT token.
   * Endpoint: POST /v1/auth/login
   *
   * @param baseUrlOverride - Dùng baseUrl khác (hữu ích khi chưa có token)
   * @param usernameOverride - Email đăng nhập
   * @param passwordOverride - Mật khẩu
   * @returns Token + thông tin user. Throw nếu thất bại.
   */
  async login(
    baseUrlOverride?: string,
    usernameOverride?: string,
    passwordOverride?: string,
  ): Promise<LoginResult> {
    const baseUrl = (baseUrlOverride ?? this.baseUrl).replace(/\/$/, '');
    const username = usernameOverride ?? '';
    const password = passwordOverride ?? '';

    const response = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: username, password }),
    });

    if (!response.ok) {
      let message = `Login failed: HTTP ${response.status}`;
      try {
        const err = (await response.json()) as { message?: string | string[] };
        message = Array.isArray(err.message) ? err.message.join(', ') : (err.message ?? message);
      } catch {
        // dùng message mặc định
      }
      throw new ApiClientError(response.status, message);
    }

    const body = (await response.json()) as unknown;
    const result = this.extractLoginResult(body);
    if (!result) {
      throw new ApiClientError(0, 'Unexpected login response shape from server');
    }
    return result;
  }

  /**
   * Validate `baseUrl` + `token` bằng cách gọi `GET /v1/auth/me`.
   * Không throw — trả về {@link ValidateResult} với thông tin user hoặc lý do lỗi.
   *
   * @param baseUrlOverride - Dùng baseUrl khác thay vì giá trị trong constructor.
   *                          Hữu ích khi muốn validate trước khi khởi tạo VNGisMap.
   * @param tokenOverride   - Dùng token khác thay vì giá trị trong constructor.
   */
  async validate(baseUrlOverride?: string, tokenOverride?: string): Promise<ValidateResult> {
    const targetBaseUrl = (baseUrlOverride ?? this.baseUrl).replace(/\/$/, '');
    const targetToken = tokenOverride ?? this.token;

    if (!targetToken) {
      return {
        valid: false,
        reason: 'Chưa có token. Cung cấp `token` hoặc dùng `username`/`password` để đăng nhập.',
      };
    }

    const url = `${targetBaseUrl}/v1/auth/me`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${targetToken}`, Accept: 'application/json' },
      });

      if (response.ok) {
        const body = (await response.json()) as unknown;
        const user = this.extractUser(body);
        return { valid: true, user };
      }

      if (response.status === 401) {
        return {
          valid: false,
          reason: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại để lấy token mới.',
        };
      }

      let message = `HTTP ${response.status}`;
      try {
        const err = (await response.json()) as { message?: string | string[] };
        message = Array.isArray(err.message) ? err.message.join(', ') : (err.message ?? message);
      } catch {
        // dùng HTTP status message
      }
      return { valid: false, reason: message };
    } catch (err) {
      const reason =
        err instanceof TypeError && err.message.includes('fetch')
          ? `Không thể kết nối đến ${targetBaseUrl}. Kiểm tra lại baseUrl.`
          : err instanceof Error
            ? err.message
            : String(err);
      return { valid: false, reason };
    }
  }

  /**
   * Xóa cache (dùng khi token thay đổi hoặc cần refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cập nhật token (vd: sau khi refresh) và xoá cache.
   */
  setToken(token: string): void {
    this.token = token;
    this.cache.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Đảm bảo đã có token trước khi gọi protected endpoint.
   * Nếu chưa có (tức config có username/password), tự động login.
   */
  private async ensureToken(): Promise<void> {
    if (this.token) return;
    const result = await this.login(this.baseUrl, this._username, this._password);
    this.token = result.accessToken;
  }

  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const fullUrl = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      fullUrl.searchParams.set(key, value);
    }
    return fullUrl.toString();
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `API error ${response.status}`;
      try {
        const errorBody = (await response.json()) as { message?: string | string[] };
        const msg = errorBody.message;
        errorMessage = Array.isArray(msg) ? msg.join(', ') : (msg ?? errorMessage);
      } catch {
        // Bỏ qua lỗi parse JSON
      }
      throw new ApiClientError(response.status, errorMessage, params);
    }

    const json = (await response.json()) as unknown;
    return this.unwrap(json, this.responseFormat) as T;
  }

  private unwrap(body: unknown, format: ResponseFormat): unknown {
    if (format === 'raw') return body;
    if (format === 'envelope') {
      return (body as ApiEnvelope<unknown>).data;
    }
    if (this.looksLikeGeoJSON(body) || this.looksLikeLookup(body)) {
      return body;
    }
    if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
      return (body as ApiEnvelope<unknown>).data;
    }
    return body;
  }

  private extractUser(body: unknown): AuthUser | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const obj = body as Record<string, unknown>;
    if (typeof obj.id === 'number' && typeof obj.email === 'string') {
      return {
        id: obj.id,
        email: obj.email,
        role: typeof obj.role === 'string' ? obj.role : 'USER',
      };
    }
    return undefined;
  }

  private extractLoginResult(body: unknown): LoginResult | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const obj = body as Record<string, unknown>;
    if (typeof obj.accessToken === 'string' && typeof obj.user === 'object' && obj.user !== null) {
      const user = this.extractUser(obj.user);
      if (user) {
        return {
          accessToken: obj.accessToken as string,
          expiresIn: typeof obj.expiresIn === 'string' ? (obj.expiresIn as string) : '7d',
          user,
        };
      }
    }
    return undefined;
  }

  private looksLikeGeoJSON(value: unknown): value is FeatureCollection {
    return (
      !!value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'FeatureCollection' &&
      Array.isArray((value as { features?: unknown }).features)
    );
  }

  private looksLikeLookup(value: unknown): value is LookupResult {
    return (
      !!value &&
      typeof value === 'object' &&
      typeof (value as { found?: unknown }).found === 'boolean' &&
      typeof (value as { point?: unknown }).point === 'object'
    );
  }

  private isFeatureCollection(value: unknown): value is VNGeoJSONCollection {
    return this.looksLikeGeoJSON(value);
  }
}
