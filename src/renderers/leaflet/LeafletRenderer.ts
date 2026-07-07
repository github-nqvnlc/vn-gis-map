import type * as L from 'leaflet';
import type { VNGeoJSONCollection, VNGeoJSONFeature } from '../../types/api.types';
import type {
  LayerOptions,
  LayerStyle,
  LngLat,
  Bounds,
  MapEvent,
  EventHandler,
  PopupOptions,
} from '../../types/config.types';
import type { IRenderer, MapInitOptions } from '../base/IRenderer';
import { mergeStyle } from '../../utils/style';

/**
 * Kiểu tối thiểu cho global Leaflet (namespace `L`)
 * Được resolve từ peer dependency `leaflet` (import động hoặc global window.L)
 */
type LeafletModule = typeof import('leaflet');

interface LeafletLayerEntry {
  layer: L.GeoJSON;
  options: LayerOptions;
  style: LayerStyle;
  clickHandlers: Set<(feature: VNGeoJSONFeature) => void>;
}

const DEFAULT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Renderer adapter dùng Leaflet.
 *
 * Leaflet phải được cung cấp: hoặc truyền vào constructor, hoặc có sẵn global `window.L`.
 */
export class LeafletRenderer implements IRenderer {
  private L: LeafletModule;
  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private layers = new Map<string, LeafletLayerEntry>();
  private layerCounter = 0;
  private eventHandlers = new Map<string, Set<EventHandler>>();

  /**
   * @param leaflet - Instance của Leaflet. Nếu không truyền sẽ dùng global `window.L`.
   */
  constructor(leaflet?: LeafletModule) {
    const resolved =
      leaflet ??
      (typeof window !== 'undefined' ? (window as unknown as { L?: LeafletModule }).L : undefined);
    if (!resolved) {
      throw new Error(
        '[LeafletRenderer] Leaflet không khả dụng. Hãy cài `leaflet` và truyền vào constructor, hoặc load global window.L.',
      );
    }
    this.L = resolved;
  }

  get isInitialized(): boolean {
    return this.map !== null;
  }

  initialize(container: HTMLElement, options: MapInitOptions): void {
    if (this.map) {
      throw new Error('[LeafletRenderer] Map đã được khởi tạo.');
    }
    const [lng, lat] = options.center;
    this.map = this.L.map(container, {
      center: [lat, lng],
      zoom: options.zoom,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
    });

    this.tileLayer = this.L.tileLayer(options.tileUrl ?? DEFAULT_TILE_URL, {
      attribution: options.attribution ?? DEFAULT_ATTRIBUTION,
      maxZoom: options.maxZoom ?? 19,
    });
    this.tileLayer.addTo(this.map);

    this.map.whenReady(() => {
      this.dispatch('ready', { target: this.map });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.dispatch('click', {
        target: this.map,
        lngLat: [e.latlng.lng, e.latlng.lat],
      });
    });
    this.map.on('moveend', () => this.dispatch('moveend', { target: this.map }));
    this.map.on('zoomend', () => this.dispatch('zoomend', { target: this.map }));
    this.map.on('movestart', () => this.dispatch('movestart', { target: this.map }));
    this.map.on('zoomstart', () => this.dispatch('zoomstart', { target: this.map }));
  }

  setView(center: LngLat, zoom: number): void {
    this.assertMap();
    const [lng, lat] = center;
    this.map!.setView([lat, lng], zoom);
  }

  fitBounds(bounds: Bounds): void {
    this.assertMap();
    const [[south, west], [north, east]] = bounds;
    this.map!.fitBounds([
      [south, west],
      [north, east],
    ]);
  }

  addGeoJSON(geojson: VNGeoJSONCollection, options: LayerOptions, layerId?: string): string {
    this.assertMap();
    const id = layerId ?? `layer-${++this.layerCounter}`;
    const baseStyle = options.style ?? {};
    const interactive = options.interactive !== false;

    const clickHandlers = new Set<(feature: VNGeoJSONFeature) => void>();

    const geoLayer = this.L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject, {
      style: (feature) => this.toLeafletPathStyle(baseStyle, options, feature as VNGeoJSONFeature),
      onEachFeature: (feature, layer) => {
        const vnFeature = feature as VNGeoJSONFeature;
        if (interactive) {
          this.bindFeatureInteractions(layer, vnFeature, options, baseStyle, clickHandlers);
        }
      },
    });

    if (options.zIndex !== undefined && 'setZIndex' in geoLayer) {
      (geoLayer as unknown as { setZIndex: (z: number) => void }).setZIndex(options.zIndex);
    }

    geoLayer.addTo(this.map!);
    this.layers.set(id, { layer: geoLayer, options, style: baseStyle, clickHandlers });
    return id;
  }

  removeLayer(layerId: string): void {
    const entry = this.layers.get(layerId);
    if (!entry || !this.map) return;
    this.map.removeLayer(entry.layer);
    this.layers.delete(layerId);
  }

  setLayerStyle(layerId: string, style: LayerStyle): void {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    entry.style = mergeStyle(entry.style, style);
    entry.layer.setStyle((feature) =>
      this.toLeafletPathStyle(entry.style, entry.options, feature as VNGeoJSONFeature),
    );
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    const entry = this.layers.get(layerId);
    if (!entry || !this.map) return;
    if (visible) {
      if (!this.map.hasLayer(entry.layer)) entry.layer.addTo(this.map);
    } else {
      this.map.removeLayer(entry.layer);
    }
  }

  on(event: MapEvent | string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: MapEvent | string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  onLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void {
    this.layers.get(layerId)?.clickHandlers.add(handler);
  }

  offLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void {
    this.layers.get(layerId)?.clickHandlers.delete(handler);
  }

  destroy(): void {
    this.layers.clear();
    this.eventHandlers.clear();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.tileLayer = null;
  }

  /**
   * Truy cập map instance native (cho advanced use-cases)
   */
  getNativeMap(): L.Map | null {
    return this.map;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private assertMap(): void {
    if (!this.map) {
      throw new Error('[LeafletRenderer] Map chưa được khởi tạo. Gọi initialize() trước.');
    }
  }

  private dispatch(
    event: string,
    payload: { target: unknown; lngLat?: LngLat; feature?: VNGeoJSONFeature; layerId?: string },
  ): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler({ type: event as MapEvent, ...payload });
      } catch (err) {
        console.error(`[LeafletRenderer] Error in "${event}" handler:`, err);
      }
    });
  }

  private toLeafletPathStyle(
    baseStyle: LayerStyle,
    options: LayerOptions,
    feature?: VNGeoJSONFeature,
  ): L.PathOptions {
    let style = baseStyle;
    if (options.styleFunction && feature) {
      const dynamic = options.styleFunction(feature);
      if (dynamic) style = mergeStyle(baseStyle, dynamic);
    }
    return {
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
      color: style.strokeColor,
      weight: style.strokeWidth,
    };
  }

  private bindFeatureInteractions(
    layer: L.Layer,
    feature: VNGeoJSONFeature,
    options: LayerOptions,
    baseStyle: LayerStyle,
    clickHandlers: Set<(feature: VNGeoJSONFeature) => void>,
  ): void {
    const path = layer as L.Path;

    path.on('mouseover', () => {
      const hoverStyle: L.PathOptions = {
        fillColor: baseStyle.hoverFillColor ?? baseStyle.fillColor,
        color: baseStyle.hoverStrokeColor ?? baseStyle.strokeColor,
        weight: (baseStyle.strokeWidth ?? 1) + 1,
        fillOpacity: Math.min((baseStyle.fillOpacity ?? 0.2) + 0.15, 1),
      };
      path.setStyle(hoverStyle);
      if ('bringToFront' in path) (path as unknown as { bringToFront: () => void }).bringToFront();
    });

    path.on('mouseout', () => {
      path.setStyle(this.toLeafletPathStyle(baseStyle, options, feature));
    });

    path.on('click', (e: L.LeafletMouseEvent) => {
      this.L.DomEvent.stopPropagation(e);
      clickHandlers.forEach((h) => h(feature));
      this.dispatch('click', {
        target: layer,
        feature,
        lngLat: [e.latlng.lng, e.latlng.lat],
      });
    });

    if (options.popup) {
      const content = this.buildPopupContent(feature, options.popup);
      if (content) path.bindPopup(content);
    }

    if (options.tooltip) {
      const tip =
        typeof options.tooltip === 'string'
          ? options.tooltip
          : (feature.properties?.name ?? feature.properties?.fullName ?? '');
      if (tip) path.bindTooltip(tip, { sticky: true });
    }
  }

  private buildPopupContent(feature: VNGeoJSONFeature, popup: boolean | PopupOptions): string {
    if (typeof popup === 'object' && popup.contentTemplate) {
      return popup.contentTemplate(feature);
    }
    const props = feature.properties;
    if (!props) return '';
    const name = props.fullName ?? props.full_name ?? props.name ?? props.code ?? '';
    const parts: string[] = [`<strong>${escapeHtml(String(name))}</strong>`];
    if (props.code) parts.push(`<div>Mã: ${escapeHtml(String(props.code))}</div>`);
    if (props.area_km2)
      parts.push(`<div>Diện tích: ${escapeHtml(String(props.area_km2))} km²</div>`);
    return `<div class="vn-gis-popup">${parts.join('')}</div>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
