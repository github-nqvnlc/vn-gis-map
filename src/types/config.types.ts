import type { VNGeoJSONFeature, VNGeoJSONCollection } from './api.types';

/**
 * Tọa độ [longitude, latitude]
 */
export type LngLat = [number, number];

/**
 * Bounds dạng [[south, west], [north, east]]
 */
export type Bounds = [[number, number], [number, number]];

/**
 * Style cho layer
 */
export interface LayerStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  /** CSS color cho hover state */
  hoverFillColor?: string;
  hoverStrokeColor?: string;
}

/**
 * Options khi thêm GeoJSON layer vào map
 */
export interface LayerOptions {
  /** Style tĩnh cho toàn bộ layer */
  style?: LayerStyle;
  /** Function trả về style dựa trên feature (dynamic styling) */
  styleFunction?: StyleFunction;
  /** Layer có click/hover được hay không */
  interactive?: boolean;
  /** z-index của layer */
  zIndex?: number;
  /** Hiển thị popup khi click không */
  popup?: boolean | PopupOptions;
  /** Tooltip hiển thị khi hover */
  tooltip?: boolean | string;
}

/**
 * Dynamic style function
 */
export type StyleFunction = (feature: VNGeoJSONFeature) => LayerStyle | undefined;

/**
 * Options cho popup khi click vào feature
 */
export interface PopupOptions {
  /** Selector nội dung popup. Nếu không có thì dùng mặc định */
  contentTemplate?: (feature: VNGeoJSONFeature) => string;
  /** CSS class thêm vào popup */
  className?: string;
}

/**
 * Cấu hình khởi tạo VNGisMap
 */
export interface VNMapConfig {
  /** Container element hoặc CSS selector */
  container: string | HTMLElement;
  /** Loại renderer */
  renderer: 'leaflet' | 'maplibre';
  /** Base URL của vn-gis-api (vd: https://api.example.com) */
  apiBaseUrl: string;
  /** API token (Bearer token). Bắt buộc nếu không dùng username + password. */
  token?: string;
  /** Email đăng nhập. Khi cung cấp cùng password, ApiClient tự động login. */
  username?: string;
  /** Mật khẩu. Bắt buộc nếu dùng username. */
  password?: string;
  /** View ban đầu */
  initialView?: {
    center: LngLat;
    zoom: number;
  };
  /** Bounds khởi tạo (sẽ fit toàn bộ nếu có) */
  initialBounds?: Bounds;
  /** Layers khởi tạo */
  layers?: InitialLayers;
  /** Base map tiles URL template. Nếu không truyền sẽ dùng OSM */
  tileUrl?: string;
  /** Attribution */
  attribution?: string;
  /** Callback khi click vào 1 tỉnh */
  onProvinceClick?: (feature: VNGeoJSONFeature) => void;
  /** Callback khi click vào 1 xã/phường */
  onWardClick?: (feature: VNGeoJSONFeature) => void;
  /** Callback khi click vào custom layer */
  onCustomLayerClick?: (feature: VNGeoJSONFeature, layerId: string) => void;
  /** Cache TTL mặc định cho API (giây) */
  cacheTtl?: number;
}

/**
 * Layers khởi tạo
 */
export interface InitialLayers {
  /** Provinces layer */
  provinces?: boolean | LayerOptions;
  /** Wards layers - một hoặc nhiều tỉnh */
  wards?: { provinceCode: string; options?: LayerOptions }[];
  /** Custom layers - fetch từ URL GeoJSON */
  custom?: { source: string; options?: LayerOptions }[];
}

/**
 * Custom layer source - URL string hoặc inline GeoJSON
 */
export type CustomLayerSource = string | VNGeoJSONCollection;

/**
 * Một layer đã đăng ký với LayerManager
 */
export interface RegisteredLayer {
  id: string;
  type: 'provinces' | 'wards' | 'custom';
  /** Reference đến layer của renderer (vd: Leaflet layer id) */
  nativeLayer: unknown;
  options: LayerOptions;
  /** Cho wards/custom: provinceCode hoặc source URL */
  meta?: {
    provinceCode?: string;
    source?: string;
  };
  /** Style đang được áp dụng */
  style: LayerStyle;
  /** Có đang visible hay không */
  visible: boolean;
}

/**
 * Map lifecycle events
 */
export type MapEvent =
  | 'ready'
  | 'click'
  | 'mousemove'
  | 'zoomstart'
  | 'zoomend'
  | 'movestart'
  | 'moveend'
  | 'load'
  | 'error';

/**
 * Event payload
 */
export interface MapEventPayload<T = unknown> {
  type: MapEvent;
  target: unknown;
  lngLat?: LngLat;
  feature?: VNGeoJSONFeature;
  layerId?: string;
  error?: Error;
  data?: T;
}

/**
 * Event handler
 */
export type EventHandler<T = unknown> = (payload: MapEventPayload<T>) => void;
