/**
 * Leaflet renderer implementation
 */

import type {
  MapOptions,
  LatLng,
  BoundsTuple,
  MarkerOptions,
  PolygonOptions,
  GeoJSONOptions,
  EventHandler,
  EventPayload,
} from '../../types';

// Map to store layer instances
const layerInstances = new Map<string, L.Layer>();

export class LeafletRenderer {
  private map: L.Map | null = null;
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private L: typeof import('leaflet') | null = null;

  initialize(container: HTMLElement, options: MapOptions): void {
    // Dynamically import Leaflet
    import('leaflet').then((leafletModule) => {
      this.L = leafletModule.default || leafletModule;
      const L = this.L;

      // Fix Leaflet's default icon issue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)['_getIconUrl'];
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const mapOptions: L.MapOptions = {
        center: [options.center[0], options.center[1]],
        zoom: options.zoom,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        scrollWheelZoom: options.scrollWheelZoom,
      };

      if (options.bounds) {
        mapOptions.maxBounds = L.latLngBounds(
          L.latLng(options.bounds[0][0], options.bounds[0][1]),
          L.latLng(options.bounds[1][0], options.bounds[1][1]),
        );
      }

      this.map = L.map(container, mapOptions);

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(this.map);

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  private setupEventForwarding(): void {
    if (!this.map || !this.L) return;

    const eventsToForward = [
      'click',
      'dblclick',
      'mousedown',
      'mouseup',
      'mouseover',
      'mouseout',
      'mousemove',
      'contextmenu',
      'zoomstart',
      'zoomend',
      'zoomlevelschange',
      'movestart',
      'move',
      'moveend',
      'dragstart',
      'drag',
      'dragend',
      'resize',
    ];

    eventsToForward.forEach((eventName) => {
      this.map!.on(
        eventName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => {
          const handlers = this.eventHandlers.get(eventName);
          if (handlers) {
            const payload: EventPayload = {
              type: eventName,
              timestamp: Date.now(),
              data: {
                lat: e.latlng?.lat,
                lng: e.latlng?.lng,
                layer: e.layer,
              },
            };
            handlers.forEach((handler) => handler(payload));
          }
        },
      );
    });

    // Emit ready event
    setTimeout(() => {
      this.emit('ready', { map: this.map });
    }, 0);
  }

  addMarker(id: string, options: MarkerOptions): void {
    if (!this.map || !this.L) return;

    const L = this.L;
    const latlng = L.latLng(options.lat, options.lng);
    let marker: L.Marker;

    if (options.icon) {
      const iconOptions = options.icon;
      // Only use Leaflet icon options
      const leafIcon = iconOptions as {
        iconUrl?: string;
        iconSize?: [number, number];
        iconAnchor?: [number, number];
        popupAnchor?: [number, number];
      };
      const icon = L.icon({
        iconUrl: leafIcon.iconUrl ?? 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: leafIcon.iconSize as L.PointExpression | undefined,
        iconAnchor: leafIcon.iconAnchor as L.PointExpression | undefined,
        popupAnchor: leafIcon.popupAnchor as L.PointExpression | undefined,
      });
      marker = L.marker(latlng, { icon });
    } else {
      marker = L.marker(latlng);
    }

    if (options.title) {
      marker.bindTooltip(options.title);
    }

    if (options.popup) {
      marker.bindPopup(options.popup);
    }

    marker.addTo(this.map);
    layerInstances.set(id, marker);
  }

  addPolygon(id: string, options: PolygonOptions): void {
    if (!this.map || !this.L) return;

    const L = this.L;
    const latlngs = options.coordinates.map((coord) => L.latLng(coord[0], coord[1]));
    const polygon = L.polygon(latlngs, {
      color: options.color ?? '#3388ff',
      fillColor: options.fillColor ?? '#3388ff',
      fillOpacity: options.fillOpacity ?? 0.2,
      weight: options.weight ?? 2,
    });

    polygon.addTo(this.map);
    layerInstances.set(id, polygon);
  }

  addGeoJSON(id: string, options: GeoJSONOptions): void {
    if (!this.map || !this.L) return;

    const L = this.L;
    const layer = L.geoJSON(options.data as GeoJSON.FeatureCollection, {
      style: options.style
        ? () => ({
            color: options.style!.color ?? '#3388ff',
            fillColor: options.style!.fillColor ?? '#3388ff',
            fillOpacity: options.style!.fillOpacity ?? 0.2,
            weight: options.style!.weight ?? 2,
            opacity: options.style!.opacity ?? 1,
          })
        : undefined,
    });

    layer.addTo(this.map);
    layerInstances.set(id, layer);
  }

  removeLayer(id: string): void {
    const layer = layerInstances.get(id);
    if (layer && this.map) {
      this.map.removeLayer(layer);
      layerInstances.delete(id);
    }
  }

  setView(center: LatLng, zoom?: number): void {
    if (this.map) {
      this.map.setView([center[0], center[1]], zoom ?? this.map.getZoom());
    }
  }

  fitBounds(bounds: BoundsTuple): void {
    if (this.map && this.L) {
      const L = this.L;
      const latLngBounds = L.latLngBounds(
        L.latLng(bounds[0][0], bounds[0][1]),
        L.latLng(bounds[1][0], bounds[1][1]),
      );
      this.map.fitBounds(latLngBounds);
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const payload: EventPayload = {
        type: event,
        timestamp: Date.now(),
        data,
      };
      handlers.forEach((handler) => handler(payload));
    }
  }

  destroy(): void {
    layerInstances.forEach((layer) => {
      if (this.map) {
        this.map.removeLayer(layer);
      }
    });
    layerInstances.clear();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.eventHandlers.clear();
  }
}
