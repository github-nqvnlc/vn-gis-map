import type { Feature, FeatureCollection, Geometry } from 'geojson';

/**
 * Properties cho GeoJSON feature từ vn-gis-api
 */
export interface VNGeoJSONFeatureProperties {
  code: string;
  name: string;
  nameEn?: string;
  fullName?: string;
  full_name?: string;
  fullNameEn?: string;
  codeName?: string;
  /** Mã tỉnh/thành - có trên ward features */
  provinceCode?: string;
  province_code?: string;
  area_km2?: number | string | null;
  /** Cho phép thuộc tính tuỳ ý khác từ API */
  [key: string]: unknown;
}

/**
 * GeoJSON Feature với properties của VN GIS
 */
export type VNGeoJSONFeature = Feature<Geometry, VNGeoJSONFeatureProperties>;

/**
 * GeoJSON FeatureCollection trả về từ vn-gis-api
 */
export type VNGeoJSONCollection = FeatureCollection<Geometry, VNGeoJSONFeatureProperties>;

/**
 * Kết quả reverse geocoding từ GET /v1/gis/lookup
 */
export interface LookupResult {
  found: boolean;
  point: { lng: number; lat: number };
  ward?: {
    ward_code: string;
    ward_name: string;
    ward_full_name: string;
    province_code: string;
    province_name: string;
    province_full_name: string;
    area_km2: string | null;
  };
}

/**
 * API response envelope từ vn-gis-api (TransformInterceptor)
 */
export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Error response từ vn-gis-api (HttpExceptionFilter)
 */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  correlationId: string;
}

/**
 * Thông tin user trả về từ GET /v1/auth/me
 */
export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

/**
 * Kết quả validate credentials.
 * Thành công → `valid: true`, kèm thông tin user.
 * Thất bại → `valid: false`, kèm lý do.
 */
export interface ValidateResult {
  valid: boolean;
  user?: AuthUser;
  reason?: string;
}

/**
 * Kết quả đăng nhập từ POST /v1/auth/login
 */
export interface LoginResult {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}
