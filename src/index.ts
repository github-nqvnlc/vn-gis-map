/**
 * @vn-gis/map - Thư viện hiển thị bản đồ GIS Việt Nam
 *
 * Entry point chính. Export core API (VNGisMap), types, utils và các helper.
 * Renderer cụ thể (Leaflet/MapLibre) được import qua sub-path:
 *   - `@vn-gis/map/leaflet`
 *   - `@vn-gis/map/maplibre`
 */

// Core
export { VNGisMap } from './core/VNGisMap';
export type { RendererFactory } from './core/VNGisMap';
export { ApiClient, ApiClientError } from './core/ApiClient';
export type { ApiClientConfig, ResponseFormat } from './core/ApiClient';
export { EventEmitter } from './core/EventEmitter';
export { LayerManager } from './core/LayerManager';

// Renderer interface (adapter base)
export type { IRenderer, MapInitOptions } from './renderers/base/IRenderer';

// Types
export type {
  VNGeoJSONFeature,
  VNGeoJSONFeatureProperties,
  VNGeoJSONCollection,
  LookupResult,
  ApiEnvelope,
  ApiError,
  ValidateResult,
  AuthUser,
} from './types/api.types';
export type {
  LngLat,
  Bounds,
  LayerStyle,
  LayerOptions,
  StyleFunction,
  PopupOptions,
  VNMapConfig,
  InitialLayers,
  CustomLayerSource,
  RegisteredLayer,
  MapEvent,
  MapEventPayload,
  EventHandler,
} from './types/config.types';
export { isFeatureCollection, isFeature } from './types/geojson.types';

// Utils & constants
export {
  VN_BOUNDS,
  VN_DEFAULT_ZOOM,
  VN_CENTER_LATLNG,
  VN_CENTER_LNGLAT,
  VN_MAP_ZOOM,
} from './utils/bounds';
export { Cache } from './utils/cache';
export {
  DEFAULT_PROVINCE_STYLE,
  DEFAULT_WARD_STYLE,
  DEFAULT_CUSTOM_STYLE,
  VN_STYLE_PRESETS,
  mergeStyle,
} from './utils/style';
