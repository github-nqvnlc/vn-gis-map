import { describe, it, expect } from 'vitest';
import { isFeature, isFeatureCollection } from '../src/types/geojson.types';

describe('geojson type guards', () => {
  describe('isFeatureCollection', () => {
    it('returns true for a valid FeatureCollection', () => {
      expect(isFeatureCollection({ type: 'FeatureCollection', features: [] })).toBe(true);
    });

    it('returns false for a Feature', () => {
      expect(isFeatureCollection({ type: 'Feature', geometry: null, properties: {} })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isFeatureCollection(null)).toBe(false);
      expect(isFeatureCollection(undefined)).toBe(false);
      expect(isFeatureCollection('FeatureCollection')).toBe(false);
      expect(isFeatureCollection(42)).toBe(false);
    });
  });

  describe('isFeature', () => {
    it('returns true for a valid Feature', () => {
      expect(isFeature({ type: 'Feature', geometry: null, properties: {} })).toBe(true);
    });

    it('returns false for a FeatureCollection', () => {
      expect(isFeature({ type: 'FeatureCollection', features: [] })).toBe(false);
    });

    it('returns false for non-objects', () => {
      expect(isFeature(null)).toBe(false);
      expect(isFeature(undefined)).toBe(false);
      expect(isFeature([])).toBe(false);
    });
  });
});
