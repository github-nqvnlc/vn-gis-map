/**
 * MapLibre GL JS renderer implementation
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
import maplibregl from 'maplibre-gl';

// Map to store layer IDs and source IDs
const layerData = new Map<string, { sourceId: string; layerId: string }>();
const sourceIds = new Set<string>();

export class MapLibreRenderer {
  private map: maplibregl.Map | null = null;
  private eventHandlers = new Map<string, Set<EventHandler>>();

  initialize(container: HTMLElement, options: MapOptions): void {
    import('maplibre-gl').then((maplibreModule) => {
      const MapLibre = maplibreModule.default || maplibreModule;

      // Import CSS dynamically
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@5.5.0/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      const mapOptions: maplibregl.MapOptions = {
        container: container,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [options.center[1], options.center[0]], // [lng, lat] for MapLibre
        zoom: options.zoom,
        minZoom: options.minZoom,
        maxZoom: options.maxZoom,
        scrollZoom: options.scrollWheelZoom ? undefined : false,
      };

      if (options.bounds) {
        mapOptions.maxBounds = [
          [options.bounds[0][1], options.bounds[0][0]], // [west, south]
          [options.bounds[1][1], options.bounds[1][0]], // [east, north]
        ];
      }

      this.map = new MapLibre.Map(mapOptions);

      this.setupEventForwarding();
    });
  }

  private setupEventForwarding(): void {
    if (!this.map) return;

    this.map.on('load', () => {
      this.emit('ready', { map: this.map });
    });

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
      'zoom',
      'movestart',
      'move',
      'moveend',
      'resize',
      'dragstart',
      'drag',
      'dragend',
      'error',
    ];

    eventsToForward.forEach((eventName) => {
      this.map!.on(eventName, (e: maplibregl.MapMouseEvent) => {
        const payload: EventPayload = {
          type: eventName,
          timestamp: Date.now(),
          data: {
            lng: e.lngLat?.lng,
            lat: e.lngLat?.lat,
            point: e.point,
          },
        };
        this.emit(eventName, payload.data);
      });
    });

    this.map.on('layer.add', (e) => {
      this.emit('layeradd', { layer: e.layer });
    });

    this.map.on('layer.remove', (e) => {
      this.emit('layerremove', { layer: e.layer });
    });
  }

  addMarker(id: string, options: MarkerOptions): void {
    if (!this.map) return;

    const sourceId = `marker-source-${id}`;
    const layerId = `marker-layer-${id}`;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [options.lng, options.lat],
          },
          properties: {
            title: options.title || '',
            popup: options.popup || '',
          },
        },
      ],
    };

    if (!sourceIds.has(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
      });
      sourceIds.add(sourceId);
    } else {
      const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData);
      }
    }

    if (!this.map.getLayer(layerId)) {
      this.map.addLayer({
        id: layerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': 'marker',
          'icon-size': 1,
          'icon-allow-overlap': true,
          'text-field': ['get', 'title'],
          'text-anchor': 'top',
          'text-offset': [0, 1],
        },
        paint: {
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
        },
      });

      if (options.popup) {
        this.map.on('click', layerId, (e) => {
          const coordinates = (e.features?.[0].geometry as GeoJSON.Point).coordinates.slice() as [
            number,
            number,
          ];
          const description =
            (e.features?.[0].properties as Record<string, string> | undefined)?.popup || '';

          new maplibregl.Popup().setLngLat(coordinates).setHTML(description).addTo(this.map!);
        });

        this.map.on('mouseenter', layerId, () => {
          if (this.map) {
            this.map.getCanvas().style.cursor = 'pointer';
          }
        });

        this.map.on('mouseleave', layerId, () => {
          if (this.map) {
            this.map.getCanvas().style.cursor = '';
          }
        });
      }
    }

    layerData.set(id, { sourceId, layerId });
  }

  addPolygon(id: string, options: PolygonOptions): void {
    if (!this.map) return;

    const sourceId = `polygon-source-${id}`;
    const layerId = `polygon-layer-${id}`;

    // Convert coordinates to GeoJSON format [lng, lat]
    const coordinates = options.coordinates.map((coord) => [coord[1], coord[0]]);
    if (coordinates.length > 0) {
      coordinates.push(coordinates[0]);
    }

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
          properties: {},
        },
      ],
    };

    if (!sourceIds.has(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
      });
      sourceIds.add(sourceId);
    } else {
      const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(geojsonData);
      }
    }

    if (!this.map.getLayer(`${layerId}-fill`)) {
      this.map.addLayer({
        id: `${layerId}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': options.fillColor ?? '#3388ff',
          'fill-opacity': options.fillOpacity ?? 0.2,
        },
      });
    }

    if (!this.map.getLayer(layerId)) {
      this.map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': options.color ?? '#3388ff',
          'line-width': options.weight ?? 2,
          'line-opacity': options.opacity ?? 1,
        },
      });
    }

    layerData.set(id, { sourceId, layerId: `${layerId}-fill` });
  }

  addGeoJSON(id: string, options: GeoJSONOptions): void {
    if (!this.map) return;

    const sourceId = `geojson-source-${id}`;
    const layerId = `geojson-layer-${id}`;

    if (!sourceIds.has(sourceId)) {
      this.map.addSource(sourceId, {
        type: 'geojson',
        data: options.data,
      });
      sourceIds.add(sourceId);
    } else {
      const source = this.map.getSource(sourceId) as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(options.data);
      }
    }

    const geometryType = this.getGeometryType(options.data);
    const layerType =
      geometryType === 'Point' || geometryType === 'MultiPoint'
        ? 'symbol'
        : geometryType === 'LineString' || geometryType === 'MultiLineString'
          ? 'line'
          : 'fill';

    if (!this.map.getLayer(layerId)) {
      if (layerType === 'symbol') {
        this.map.addLayer({
          id: layerId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'icon-image': 'marker',
            'icon-size': 1,
            'icon-allow-overlap': true,
          },
          paint: {
            'text-halo-color': '#ffffff',
            'text-halo-width': 1,
          },
        });
      } else if (layerType === 'line') {
        this.map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': options.style?.color ?? '#3388ff',
            'line-width': options.style?.weight ?? 2,
            'line-opacity': options.style?.opacity ?? 1,
          },
        });
      } else {
        this.map.addLayer({
          id: layerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': options.style?.fillColor ?? options.style?.color ?? '#3388ff',
            'fill-opacity': options.style?.fillOpacity ?? 0.2,
          },
        });

        const outlineId = `${layerId}-outline`;
        if (!this.map.getLayer(outlineId)) {
          this.map.addLayer({
            id: outlineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': options.style?.color ?? '#3388ff',
              'line-width': options.style?.weight ?? 2,
              'line-opacity': options.style?.opacity ?? 1,
            },
          });
        }
      }
    }

    layerData.set(id, { sourceId, layerId });
  }

  private getGeometryType(data: GeoJSON.FeatureCollection | GeoJSON.Feature): string {
    if (data.type === 'Feature') {
      return data.geometry?.type || '';
    }
    const feature = data.features.find((f) => f.geometry !== null);
    return feature?.geometry?.type || '';
  }

  removeLayer(id: string): void {
    if (!this.map) return;

    const data = layerData.get(id);
    if (data) {
      try {
        if (this.map.getLayer(data.layerId)) {
          this.map.removeLayer(data.layerId);
        }
        const outlineId = `${data.layerId}-outline`;
        if (this.map.getLayer(outlineId)) {
          this.map.removeLayer(outlineId);
        }
        const fillId = `${data.layerId}-fill`;
        if (this.map.getLayer(fillId)) {
          this.map.removeLayer(fillId);
        }
      } catch {
        // Layer may not exist
      }

      try {
        if (sourceIds.has(data.sourceId)) {
          this.map.removeSource(data.sourceId);
          sourceIds.delete(data.sourceId);
        }
      } catch {
        // Source may not exist
      }

      layerData.delete(id);
    }
  }

  setView(center: LatLng, zoom?: number): void {
    if (this.map) {
      this.map.flyTo({
        center: [center[1], center[0]],
        zoom: zoom ?? this.map.getZoom(),
      });
    }
  }

  fitBounds(bounds: BoundsTuple): void {
    if (this.map) {
      this.map.fitBounds(
        [
          [bounds[0][1], bounds[0][0]],
          [bounds[1][1], bounds[1][0]],
        ],
        { padding: 20 },
      );
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
    layerData.forEach((_, id) => {
      this.removeLayer(id);
    });

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.eventHandlers.clear();
  }
}
