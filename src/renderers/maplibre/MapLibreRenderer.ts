import type * as maplibregl from 'maplibre-gl';
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

type MapLibreModule = typeof import('maplibre-gl');

interface MapLibreLayerEntry {
  sourceId: string;
  fillLayerId: string;
  lineLayerId: string;
  options: LayerOptions;
  style: LayerStyle;
  clickHandlers: Set<(feature: VNGeoJSONFeature) => void>;
  interactive: boolean;
}

const DEFAULT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Renderer adapter dùng MapLibre GL JS.
 *
 * MapLibre phải được cung cấp: hoặc truyền vào constructor, hoặc có sẵn global `window.maplibregl`.
 */
export class MapLibreRenderer implements IRenderer {
  private maplibre: MapLibreModule;
  private map: maplibregl.Map | null = null;
  private layers = new Map<string, MapLibreLayerEntry>();
  private layerCounter = 0;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private popup: maplibregl.Popup | null = null;
  private loaded = false;
  private pendingOps: Array<() => void> = [];

  /**
   * @param maplibre - Module maplibre-gl. Nếu không truyền sẽ dùng global `window.maplibregl`.
   */
  constructor(maplibre?: MapLibreModule) {
    const resolved =
      maplibre ??
      (typeof window !== 'undefined'
        ? (window as unknown as { maplibregl?: MapLibreModule }).maplibregl
        : undefined);
    if (!resolved) {
      throw new Error(
        '[MapLibreRenderer] maplibre-gl không khả dụng. Hãy cài `maplibre-gl` và truyền vào constructor, hoặc load global window.maplibregl.',
      );
    }
    this.maplibre = resolved;
  }

  get isInitialized(): boolean {
    return this.map !== null;
  }

  initialize(container: HTMLElement, options: MapInitOptions): void {
    if (this.map) {
      throw new Error('[MapLibreRenderer] Map đã được khởi tạo.');
    }
    const [lng, lat] = options.center;
    const tileUrl = options.tileUrl ?? DEFAULT_TILE_URL;

    this.map = new this.maplibre.Map({
      container,
      center: [lng, lat],
      zoom: options.zoom - 1,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      style: {
        version: 8,
        sources: {
          'osm-base': {
            type: 'raster',
            tiles: [tileUrl.replace('{s}', 'a')],
            tileSize: 256,
            attribution: options.attribution ?? DEFAULT_ATTRIBUTION,
          },
        },
        layers: [
          {
            id: 'osm-base-layer',
            type: 'raster',
            source: 'osm-base',
          },
        ],
      },
    });

    this.popup = new this.maplibre.Popup({ closeButton: true, closeOnClick: true });

    this.map.on('load', () => {
      this.loaded = true;
      this.flushPending();
      this.dispatch('ready', { target: this.map });
      this.dispatch('load', { target: this.map });
    });

    this.map.on('click', (e: maplibregl.MapMouseEvent) => {
      this.dispatch('click', {
        target: this.map,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });
    });
    this.map.on('moveend', () => this.dispatch('moveend', { target: this.map }));
    this.map.on('zoomend', () => this.dispatch('zoomend', { target: this.map }));
    this.map.on('movestart', () => this.dispatch('movestart', { target: this.map }));
    this.map.on('zoomstart', () => this.dispatch('zoomstart', { target: this.map }));
  }

  setView(center: LngLat, zoom: number): void {
    this.assertMap();
    this.map!.jumpTo({ center: [center[0], center[1]], zoom: zoom - 1 });
  }

  fitBounds(bounds: Bounds): void {
    this.assertMap();
    const [[south, west], [north, east]] = bounds;
    this.map!.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 20 },
    );
  }

  addGeoJSON(geojson: VNGeoJSONCollection, options: LayerOptions, layerId?: string): string {
    this.assertMap();
    const id = layerId ?? `layer-${++this.layerCounter}`;
    const op = () => this.addGeoJSONInternal(id, geojson, options);
    if (this.loaded) {
      op();
    } else {
      this.pendingOps.push(op);
    }
    return id;
  }

  removeLayer(layerId: string): void {
    const entry = this.layers.get(layerId);
    if (!entry || !this.map) return;
    const run = () => {
      if (!this.map) return;
      if (this.map.getLayer(entry.fillLayerId)) this.map.removeLayer(entry.fillLayerId);
      if (this.map.getLayer(entry.lineLayerId)) this.map.removeLayer(entry.lineLayerId);
      if (this.map.getSource(entry.sourceId)) this.map.removeSource(entry.sourceId);
      this.layers.delete(layerId);
    };
    if (this.loaded) run();
    else this.pendingOps.push(run);
  }

  setLayerStyle(layerId: string, style: LayerStyle): void {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    entry.style = mergeStyle(entry.style, style);
    const run = () => {
      if (!this.map) return;
      const s = entry.style;
      if (s.fillColor !== undefined)
        this.map.setPaintProperty(entry.fillLayerId, 'fill-color', s.fillColor);
      if (s.fillOpacity !== undefined)
        this.map.setPaintProperty(entry.fillLayerId, 'fill-opacity', s.fillOpacity);
      if (s.strokeColor !== undefined)
        this.map.setPaintProperty(entry.lineLayerId, 'line-color', s.strokeColor);
      if (s.strokeWidth !== undefined)
        this.map.setPaintProperty(entry.lineLayerId, 'line-width', s.strokeWidth);
    };
    if (this.loaded) run();
    else this.pendingOps.push(run);
  }

  setLayerVisibility(layerId: string, visible: boolean): void {
    const entry = this.layers.get(layerId);
    if (!entry) return;
    const run = () => {
      if (!this.map) return;
      const v = visible ? 'visible' : 'none';
      this.map.setLayoutProperty(entry.fillLayerId, 'visibility', v);
      this.map.setLayoutProperty(entry.lineLayerId, 'visibility', v);
    };
    if (this.loaded) run();
    else this.pendingOps.push(run);
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
    this.pendingOps = [];
    this.popup?.remove();
    this.popup = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.loaded = false;
  }

  /**
   * Truy cập map instance native (cho advanced use-cases)
   */
  getNativeMap(): maplibregl.Map | null {
    return this.map;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private addGeoJSONInternal(
    id: string,
    geojson: VNGeoJSONCollection,
    options: LayerOptions,
  ): void {
    if (!this.map) return;
    const sourceId = `${id}-src`;
    const fillLayerId = `${id}-fill`;
    const lineLayerId = `${id}-line`;
    const baseStyle = options.style ?? {};
    const interactive = options.interactive !== false;

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: geojson as unknown as GeoJSON.FeatureCollection,
    });

    this.map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': baseStyle.fillColor ?? '#4a90d9',
        'fill-opacity': baseStyle.fillOpacity ?? 0.2,
      },
    });

    this.map.addLayer({
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': baseStyle.strokeColor ?? '#2c6fad',
        'line-width': baseStyle.strokeWidth ?? 1.5,
      },
    });

    const entry: MapLibreLayerEntry = {
      sourceId,
      fillLayerId,
      lineLayerId,
      options,
      style: baseStyle,
      clickHandlers: new Set(),
      interactive,
    };
    this.layers.set(id, entry);

    if (interactive) {
      this.bindLayerInteractions(fillLayerId, entry, options);
    }
  }

  private bindLayerInteractions(
    fillLayerId: string,
    entry: MapLibreLayerEntry,
    options: LayerOptions,
  ): void {
    if (!this.map) return;
    const map = this.map;

    map.on('mouseenter', fillLayerId, () => {
      map.getCanvas().style.cursor = 'pointer';
      if (entry.style.hoverFillColor) {
        map.setPaintProperty(fillLayerId, 'fill-color', entry.style.hoverFillColor);
      }
      map.setPaintProperty(
        fillLayerId,
        'fill-opacity',
        Math.min((entry.style.fillOpacity ?? 0.2) + 0.15, 1),
      );
    });

    map.on('mouseleave', fillLayerId, () => {
      map.getCanvas().style.cursor = '';
      map.setPaintProperty(fillLayerId, 'fill-color', entry.style.fillColor ?? '#4a90d9');
      map.setPaintProperty(fillLayerId, 'fill-opacity', entry.style.fillOpacity ?? 0.2);
    });

    map.on('click', fillLayerId, (e: maplibregl.MapLayerMouseEvent) => {
      const feature = e.features?.[0] as unknown as VNGeoJSONFeature | undefined;
      if (!feature) return;
      entry.clickHandlers.forEach((h) => h(feature));
      this.dispatch('click', {
        target: map,
        feature,
        lngLat: [e.lngLat.lng, e.lngLat.lat],
      });
      if (options.popup && this.popup) {
        const content = this.buildPopupContent(feature, options.popup);
        if (content) {
          this.popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
        }
      }
    });
  }

  private flushPending(): void {
    const ops = this.pendingOps;
    this.pendingOps = [];
    ops.forEach((op) => op());
  }

  private assertMap(): void {
    if (!this.map) {
      throw new Error('[MapLibreRenderer] Map chưa được khởi tạo. Gọi initialize() trước.');
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
        console.error(`[MapLibreRenderer] Error in "${event}" handler:`, err);
      }
    });
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
