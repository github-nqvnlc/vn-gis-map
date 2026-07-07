import type {
  VNMapConfig,
  LngLat,
  Bounds,
  LayerOptions,
  LayerStyle,
  MapEvent,
  EventHandler,
  InitialLayers,
} from '../types/config.types';
import type { VNGeoJSONFeature, VNGeoJSONCollection, LookupResult } from '../types/api.types';
import type { IRenderer } from '../renderers/base/IRenderer';
import { ApiClient } from './ApiClient';
import { EventEmitter } from './EventEmitter';
import { LayerManager } from './LayerManager';
import { VN_CENTER_LNGLAT, VN_DEFAULT_ZOOM, VN_MAP_ZOOM } from '../utils/bounds';
import {
  DEFAULT_PROVINCE_STYLE,
  DEFAULT_WARD_STYLE,
  DEFAULT_CUSTOM_STYLE,
  mergeStyle,
} from '../utils/style';

/**
 * Factory tạo renderer. Cho phép người dùng inject renderer tuỳ chọn.
 */
export type RendererFactory = (config: VNMapConfig) => IRenderer;

/**
 * Layer id cố định cho provinces layer.
 */
const PROVINCES_LAYER_ID = 'vn-provinces';

/**
 * Prefix cho wards layer id (mỗi tỉnh 1 layer riêng).
 */
const WARDS_LAYER_PREFIX = 'vn-wards';

/**
 * VNGisMap - Điểm truy cập chính của thư viện.
 *
 * Kết hợp renderer (Leaflet/MapLibre), ApiClient (vn-gis-api) và LayerManager
 * để cung cấp API cấp cao: hiển thị tỉnh/thành, xã/phường, custom GeoJSON,
 * reverse geocoding, và quản lý sự kiện.
 *
 * @example
 * ```ts
 * import { VNGisMap } from '@vn-gis/map';
 * import { LeafletRenderer } from '@vn-gis/map/leaflet';
 * import * as L from 'leaflet';
 *
 * const map = new VNGisMap(
 *   {
 *     container: 'map',
 *     renderer: 'leaflet',
 *     apiBaseUrl: 'https://api.example.com',
 *     token: 'xxx',
 *     layers: { provinces: true },
 *   },
 *   () => new LeafletRenderer(L),
 * );
 * ```
 */
export class VNGisMap {
  private readonly config: VNMapConfig;
  private readonly renderer: IRenderer;
  private readonly api: ApiClient;
  private readonly layerManager: LayerManager;
  private readonly emitter = new EventEmitter();
  private ready = false;

  /**
   * @param config - Cấu hình khởi tạo.
   * @param rendererFactory - Factory tạo renderer instance. Bắt buộc vì renderer
   *   là peer dependency (Leaflet/MapLibre) và được inject để tránh bundle cứng.
   */
  constructor(config: VNMapConfig, rendererFactory: RendererFactory) {
    this.config = config;
    this.renderer = rendererFactory(config);
    this.api = new ApiClient({
      baseUrl: config.apiBaseUrl,
      token: config.token,
      username: config.username,
      password: config.password,
      cacheTtl: config.cacheTtl,
    });
    this.layerManager = new LayerManager(this.renderer);

    this.init();
  }

  /**
   * True khi map đã sẵn sàng (đã render xong lần đầu).
   */
  get isReady(): boolean {
    return this.ready;
  }

  /**
   * Truy cập renderer bên dưới (advanced use-cases).
   */
  getRenderer(): IRenderer {
    return this.renderer;
  }

  /**
   * Truy cập ApiClient (advanced use-cases).
   */
  getApiClient(): ApiClient {
    return this.api;
  }

  /**
   * Truy cập LayerManager.
   */
  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  // ---------------------------------------------------------------------------
  // Layers cấp cao
  // ---------------------------------------------------------------------------

  /**
   * Hiển thị toàn bộ tỉnh/thành Việt Nam.
   *
   * @param options - Tuỳ chọn style/tương tác. Style mặc định là {@link DEFAULT_PROVINCE_STYLE}.
   * @returns Layer id để tham chiếu về sau.
   */
  async showProvinces(options: LayerOptions = {}): Promise<string> {
    const geojson = await this.api.getProvinces();
    const merged: LayerOptions = {
      ...options,
      style: mergeStyle(DEFAULT_PROVINCE_STYLE, options.style),
    };
    this.layerManager.add(PROVINCES_LAYER_ID, 'provinces', geojson, merged);
    this.wireLayerClick(PROVINCES_LAYER_ID, (feature) => {
      this.config.onProvinceClick?.(feature);
    });
    return PROVINCES_LAYER_ID;
  }

  /**
   * Ẩn layer tỉnh/thành.
   */
  hideProvinces(): void {
    this.layerManager.remove(PROVINCES_LAYER_ID);
  }

  /**
   * Hiển thị xã/phường của 1 tỉnh.
   *
   * @param provinceCode - Mã tỉnh (vd: "01" cho Hà Nội).
   * @param options - Tuỳ chọn style/tương tác. Mặc định {@link DEFAULT_WARD_STYLE}.
   * @returns Layer id.
   */
  async showWards(provinceCode: string, options: LayerOptions = {}): Promise<string> {
    const geojson = await this.api.getWards(provinceCode);
    const layerId = `${WARDS_LAYER_PREFIX}-${provinceCode}`;
    const merged: LayerOptions = {
      ...options,
      style: mergeStyle(DEFAULT_WARD_STYLE, options.style),
    };
    this.layerManager.add(layerId, 'wards', geojson, merged, { provinceCode });
    this.wireLayerClick(layerId, (feature) => {
      this.config.onWardClick?.(feature);
    });
    return layerId;
  }

  /**
   * Ẩn layer xã/phường của 1 tỉnh.
   */
  hideWards(provinceCode: string): void {
    this.layerManager.remove(`${WARDS_LAYER_PREFIX}-${provinceCode}`);
  }

  /**
   * Thêm custom GeoJSON layer từ URL hoặc inline data.
   *
   * @param source - URL trả về GeoJSON, hoặc object GeoJSON inline.
   * @param options - Tuỳ chọn style/tương tác. Mặc định {@link DEFAULT_CUSTOM_STYLE}.
   * @param layerId - Id tuỳ chọn. Nếu không truyền sẽ tự sinh.
   * @returns Layer id.
   */
  async addCustomLayer(
    source: string | VNGeoJSONCollection,
    options: LayerOptions = {},
    layerId?: string,
  ): Promise<string> {
    const geojson = typeof source === 'string' ? await this.api.fetchGeoJSON(source) : source;
    const id = layerId ?? `vn-custom-${Date.now()}`;
    const merged: LayerOptions = {
      ...options,
      style: mergeStyle(DEFAULT_CUSTOM_STYLE, options.style),
    };
    this.layerManager.add(id, 'custom', geojson, merged, {
      source: typeof source === 'string' ? source : undefined,
    });
    this.wireLayerClick(id, (feature) => {
      this.config.onCustomLayerClick?.(feature, id);
    });
    return id;
  }

  /**
   * Xoá 1 layer bất kỳ theo id.
   */
  removeLayer(layerId: string): boolean {
    return this.layerManager.remove(layerId);
  }

  /**
   * Cập nhật style cho 1 layer.
   */
  setLayerStyle(layerId: string, style: LayerStyle): boolean {
    return this.layerManager.setStyle(layerId, style);
  }

  /**
   * Ẩn/hiện 1 layer.
   */
  setLayerVisibility(layerId: string, visible: boolean): boolean {
    return this.layerManager.setVisibility(layerId, visible);
  }

  /**
   * Bật/tắt hiển thị 1 layer.
   */
  toggleLayer(layerId: string): boolean {
    return this.layerManager.toggle(layerId);
  }

  // ---------------------------------------------------------------------------
  // Geocoding & navigation
  // ---------------------------------------------------------------------------

  /**
   * Reverse geocoding - tìm xã/phường + tỉnh từ toạ độ.
   *
   * @param lng - Kinh độ.
   * @param lat - Vĩ độ.
   */
  async reverseGeocode(lng: number, lat: number): Promise<LookupResult> {
    return this.api.reverseGeocode(lng, lat);
  }

  /**
   * Set view (center + zoom).
   * @param center - [lng, lat].
   */
  setView(center: LngLat, zoom: number = VN_MAP_ZOOM.province): void {
    this.renderer.setView(center, zoom);
  }

  /**
   * Fit map vào bounds.
   */
  fitBounds(bounds: Bounds): void {
    this.renderer.fitBounds(bounds);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Đăng ký lắng nghe map event.
   */
  on<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    this.emitter.on(event, handler);
    return this;
  }

  /**
   * Huỷ đăng ký map event.
   */
  off<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    this.emitter.off(event, handler);
    return this;
  }

  /**
   * Đăng ký lắng nghe 1 lần.
   */
  once<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    this.emitter.once(event, handler);
    return this;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Giải phóng toàn bộ resources (map, layers, listeners, cache).
   */
  destroy(): void {
    this.layerManager.clear();
    this.renderer.destroy();
    this.emitter.removeAllListeners();
    this.api.clearCache();
    this.ready = false;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private init(): void {
    const container = this.resolveContainer(this.config.container);
    const initialView = this.config.initialView;

    this.renderer.initialize(container, {
      center: initialView?.center ?? VN_CENTER_LNGLAT,
      zoom: initialView?.zoom ?? VN_DEFAULT_ZOOM,
      minZoom: VN_MAP_ZOOM.min,
      maxZoom: VN_MAP_ZOOM.max,
      tileUrl: this.config.tileUrl,
      attribution: this.config.attribution,
    });

    this.forwardRendererEvents();

    this.renderer.on('ready', () => {
      this.ready = true;
      if (this.config.initialBounds) {
        this.renderer.fitBounds(this.config.initialBounds);
      }
      if (this.config.layers) {
        void this.loadInitialLayers(this.config.layers);
      }
      this.emitter.emit('ready', { target: this });
    });
  }

  private forwardRendererEvents(): void {
    const events: MapEvent[] = [
      'click',
      'mousemove',
      'zoomstart',
      'zoomend',
      'movestart',
      'moveend',
      'load',
      'error',
    ];
    for (const evt of events) {
      this.renderer.on(evt, (payload) => {
        this.emitter.emit(evt, {
          target: this,
          lngLat: payload.lngLat,
          feature: payload.feature,
          layerId: payload.layerId,
          error: payload.error,
          data: payload.data,
        });
      });
    }
  }

  private async loadInitialLayers(layers: InitialLayers): Promise<void> {
    try {
      if (layers.provinces) {
        const opts = typeof layers.provinces === 'object' ? layers.provinces : {};
        await this.showProvinces(opts);
      }
      if (layers.wards) {
        for (const w of layers.wards) {
          await this.showWards(w.provinceCode, w.options ?? {});
        }
      }
      if (layers.custom) {
        for (const c of layers.custom) {
          await this.addCustomLayer(c.source, c.options ?? {});
        }
      }
    } catch (err) {
      this.emitter.emit('error', {
        target: this,
        error: err instanceof Error ? err : new Error(String(err)),
      });
    }
  }

  private wireLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void {
    this.renderer.onLayerClick(layerId, handler);
  }

  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === 'string') {
      const el = document.getElementById(container) ?? document.querySelector(container);
      if (!el) {
        throw new Error(`[VNGisMap] Không tìm thấy container "${container}".`);
      }
      return el as HTMLElement;
    }
    return container;
  }
}
