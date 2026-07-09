/**
 * Tests for bounds constants
 */

import { describe, it, expect } from 'vitest';
import {
  VN_BOUNDS,
  VN_CENTER,
  VN_DEFAULT_ZOOM,
  VN_MIN_ZOOM,
  VN_MAX_ZOOM,
  VN_CITY_ZOOM,
  VN_DISTRICT_ZOOM,
  VN_STREET_ZOOM,
} from '../src/utils/bounds';

describe('Bounds Constants', () => {
  describe('VN_BOUNDS', () => {
    it('should be defined', () => {
      expect(VN_BOUNDS).toBeDefined();
    });

    it('should have southwest and northeast corners', () => {
      expect(VN_BOUNDS).toHaveLength(2);
    });

    it('should have valid coordinates', () => {
      const [southwest, northeast] = VN_BOUNDS;
      // Southwest should have lower values
      expect(southwest[0]).toBeLessThan(northeast[0]); // lat
      expect(southwest[1]).toBeLessThan(northeast[1]); // lng
    });

    it('should cover Vietnam latitude range', () => {
      const [southwest, northeast] = VN_BOUNDS;
      expect(southwest[0]).toBeGreaterThan(8); // South of Vietnam ~8°N
      expect(northeast[0]).toBeLessThan(24); // North of Vietnam ~23°N
    });

    it('should cover Vietnam longitude range', () => {
      const [southwest, northeast] = VN_BOUNDS;
      expect(southwest[1]).toBeGreaterThan(102); // West ~102°E
      expect(northeast[1]).toBeLessThan(110); // East ~109°E
    });
  });

  describe('VN_CENTER', () => {
    it('should be defined', () => {
      expect(VN_CENTER).toBeDefined();
    });

    it('should be an array of 2 numbers', () => {
      expect(VN_CENTER).toHaveLength(2);
      expect(typeof VN_CENTER[0]).toBe('number');
      expect(typeof VN_CENTER[1]).toBe('number');
    });

    it('should be within Vietnam bounds', () => {
      const [southwest, northeast] = VN_BOUNDS;
      expect(VN_CENTER[0]).toBeGreaterThanOrEqual(southwest[0]);
      expect(VN_CENTER[0]).toBeLessThanOrEqual(northeast[0]);
      expect(VN_CENTER[1]).toBeGreaterThanOrEqual(southwest[1]);
      expect(VN_CENTER[1]).toBeLessThanOrEqual(northeast[1]);
    });

    it('should represent center of Vietnam (roughly Ha Noi area)', () => {
      // VN_CENTER should be around Ha Noi
      expect(VN_CENTER[0]).toBeGreaterThan(13); // Not too far south
      expect(VN_CENTER[0]).toBeLessThan(16); // Not too far north
      expect(VN_CENTER[1]).toBeGreaterThan(105); // Not too far west
      expect(VN_CENTER[1]).toBeLessThan(110); // Not too far east
    });
  });

  describe('Zoom Levels', () => {
    it('should have valid default zoom', () => {
      expect(VN_DEFAULT_ZOOM).toBeGreaterThan(0);
      expect(VN_DEFAULT_ZOOM).toBeLessThan(20);
    });

    it('should have valid min/max zoom', () => {
      expect(VN_MIN_ZOOM).toBeGreaterThan(0);
      expect(VN_MAX_ZOOM).toBeLessThanOrEqual(22);
      expect(VN_MIN_ZOOM).toBeLessThan(VN_MAX_ZOOM);
    });

    it('should have valid city zoom', () => {
      expect(VN_CITY_ZOOM).toBeGreaterThan(VN_MIN_ZOOM);
      expect(VN_CITY_ZOOM).toBeLessThan(VN_MAX_ZOOM);
    });

    it('should have valid district zoom', () => {
      expect(VN_DISTRICT_ZOOM).toBeGreaterThan(VN_CITY_ZOOM);
      expect(VN_DISTRICT_ZOOM).toBeLessThan(VN_MAX_ZOOM);
    });

    it('should have valid street zoom', () => {
      expect(VN_STREET_ZOOM).toBeGreaterThan(VN_DISTRICT_ZOOM);
      expect(VN_STREET_ZOOM).toBeLessThanOrEqual(VN_MAX_ZOOM);
    });

    it('should have zoom levels in ascending order', () => {
      expect(VN_DEFAULT_ZOOM).toBeLessThan(VN_CITY_ZOOM);
      expect(VN_CITY_ZOOM).toBeLessThan(VN_DISTRICT_ZOOM);
      expect(VN_DISTRICT_ZOOM).toBeLessThan(VN_STREET_ZOOM);
    });
  });
});
