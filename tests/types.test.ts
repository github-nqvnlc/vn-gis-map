/**
 * Tests for type definitions
 */

import { describe, it, expect } from 'vitest';
import type {
  MapConfig,
  MarkerOptions,
  PolygonOptions,
  GeoJSONOptions,
  LatLng,
  BoundsTuple,
} from '../src/types';

describe('Type Definitions', () => {
  describe('LatLng', () => {
    it('should be a tuple of two numbers', () => {
      const coord: LatLng = [21.0285, 105.8542];
      expect(coord).toHaveLength(2);
      expect(typeof coord[0]).toBe('number');
      expect(typeof coord[1]).toBe('number');
    });
  });

  describe('BoundsTuple', () => {
    it('should be a tuple of two LatLng tuples', () => {
      const bounds: BoundsTuple = [
        [8.18, 102.14],
        [23.24, 109.47],
      ];
      expect(bounds).toHaveLength(2);
      expect(bounds[0]).toHaveLength(2);
      expect(bounds[1]).toHaveLength(2);
    });
  });

  describe('MapConfig', () => {
    it('should accept valid configuration', () => {
      const config: MapConfig = {
        container: 'map',
        renderer: 'leaflet',
        center: [21.0285, 105.8542],
        zoom: 12,
        maxZoom: 18,
        minZoom: 5,
        bounds: [
          [8.18, 102.14],
          [23.24, 109.47],
        ],
        scrollWheelZoom: true,
      };
      expect(config.container).toBe('map');
      expect(config.renderer).toBe('leaflet');
    });

    it('should accept minimal configuration', () => {
      const config: MapConfig = {
        container: 'map',
      };
      expect(config.container).toBe('map');
    });
  });

  describe('MarkerOptions', () => {
    it('should require lat and lng', () => {
      const marker: MarkerOptions = {
        lat: 21.0285,
        lng: 105.8542,
      };
      expect(marker.lat).toBe(21.0285);
      expect(marker.lng).toBe(105.8542);
    });

    it('should accept optional properties', () => {
      const marker: MarkerOptions = {
        lat: 21.0285,
        lng: 105.8542,
        title: 'Hanoi',
        popup: '<strong>Hanoi</strong>',
      };
      expect(marker.title).toBe('Hanoi');
      expect(marker.popup).toBe('<strong>Hanoi</strong>');
    });
  });

  describe('PolygonOptions', () => {
    it('should require coordinates', () => {
      const polygon: PolygonOptions = {
        coordinates: [
          [21.0, 105.8],
          [21.1, 105.9],
          [21.0, 105.9],
        ],
      };
      expect(polygon.coordinates).toHaveLength(3);
    });

    it('should accept optional styling', () => {
      const polygon: PolygonOptions = {
        coordinates: [
          [21.0, 105.8],
          [21.1, 105.9],
          [21.0, 105.9],
        ],
        color: '#ff0000',
        fillColor: '#00ff00',
        fillOpacity: 0.5,
        weight: 3,
      };
      expect(polygon.color).toBe('#ff0000');
      expect(polygon.fillColor).toBe('#00ff00');
      expect(polygon.fillOpacity).toBe(0.5);
      expect(polygon.weight).toBe(3);
    });
  });

  describe('GeoJSONOptions', () => {
    it('should require GeoJSON data', () => {
      const geojson: GeoJSONOptions = {
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      };
      expect(geojson.data.type).toBe('FeatureCollection');
    });

    it('should accept optional style', () => {
      const geojson: GeoJSONOptions = {
        data: {
          type: 'FeatureCollection',
          features: [],
        },
        style: {
          color: '#3388ff',
          fillColor: '#3388ff',
          fillOpacity: 0.2,
          weight: 2,
        },
      };
      expect(geojson.style?.color).toBe('#3388ff');
      expect(geojson.style?.fillOpacity).toBe(0.2);
    });
  });
});
