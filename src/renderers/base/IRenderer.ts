import type { VNGeoJSONCollection, VNGeoJSONFeature } from '../../types/api.types';
import type {
  LayerOptions,
  LayerStyle,
  LngLat,
  Bounds,
  MapEvent,
  EventHandler,
} from '../../types/config.types';

/**
 * Options khởi tạo map instance
 */
export interface MapInitOptions {
  center: LngLat;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  /** Base tile URL template */
  tileUrl?: string;
  attribution?: string;
}

/**
 * Interface chung cho tất cả renderer adapters
 * Mỗi renderer (Leaflet, MapLibre, ...) phải implement interface này
 */
export interface IRenderer {
  /**
   * Khởi tạo bản đồ vào container element
   */
  initialize(container: HTMLElement, options: MapInitOptions): void;

  /**
   * Set view (center + zoom)
   * @param center - [lng, lat]
   */
  setView(center: LngLat, zoom: number): void;

  /**
   * Fit bounds
   * @param bounds - [[south, west], [north, east]]
   */
  fitBounds(bounds: Bounds): void;

  /**
   * Thêm GeoJSON layer vào map
   * @returns layerId dùng để reference về sau
   */
  addGeoJSON(geojson: VNGeoJSONCollection, options: LayerOptions, layerId?: string): string;

  /**
   * Xóa layer khỏi map
   */
  removeLayer(layerId: string): void;

  /**
   * Cập nhật style cho layer
   */
  setLayerStyle(layerId: string, style: LayerStyle): void;

  /**
   * Ẩn/hiện layer
   */
  setLayerVisibility(layerId: string, visible: boolean): void;

  /**
   * Đăng ký event handler cho map events
   */
  on(event: MapEvent | string, handler: EventHandler): void;

  /**
   * Hủy đăng ký event handler
   */
  off(event: MapEvent | string, handler: EventHandler): void;

  /**
   * Đăng ký click handler cho 1 layer
   */
  onLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void;

  /**
   * Hủy đăng ký click handler cho 1 layer
   */
  offLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void;

  /**
   * Destroy bản đồ và giải phóng resources
   */
  destroy(): void;

  /**
   * True nếu map đã được khởi tạo
   */
  readonly isInitialized: boolean;
}
