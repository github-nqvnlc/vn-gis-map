import { describe, it, expect } from 'vitest';
import {
  VN_BOUNDS,
  VN_DEFAULT_ZOOM,
  VN_CENTER_LATLNG,
  VN_CENTER_LNGLAT,
  VN_MAP_ZOOM,
} from '../src/utils/bounds';

describe('VN bounds constants', () => {
  it('has coherent north/south/east/west', () => {
    expect(VN_BOUNDS.north).toBeGreaterThan(VN_BOUNDS.south);
    expect(VN_BOUNDS.east).toBeGreaterThan(VN_BOUNDS.west);
  });

  it('center is within bounds', () => {
    const [lng, lat] = VN_BOUNDS.center;
    expect(lat).toBeGreaterThanOrEqual(VN_BOUNDS.south);
    expect(lat).toBeLessThanOrEqual(VN_BOUNDS.north);
    expect(lng).toBeGreaterThanOrEqual(VN_BOUNDS.west);
    expect(lng).toBeLessThanOrEqual(VN_BOUNDS.east);
  });

  it('asBounds is [[south, west], [north, east]]', () => {
    const [[south, west], [north, east]] = VN_BOUNDS.asBounds;
    expect(south).toBe(VN_BOUNDS.south);
    expect(west).toBe(VN_BOUNDS.west);
    expect(north).toBe(VN_BOUNDS.north);
    expect(east).toBe(VN_BOUNDS.east);
  });

  it('center lat/lng and lng/lat are consistent (swapped)', () => {
    expect(VN_CENTER_LATLNG[0]).toBe(VN_CENTER_LNGLAT[1]);
    expect(VN_CENTER_LATLNG[1]).toBe(VN_CENTER_LNGLAT[0]);
  });

  it('zoom levels are ordered', () => {
    expect(VN_MAP_ZOOM.min).toBeLessThan(VN_MAP_ZOOM.max);
    expect(VN_MAP_ZOOM.province).toBeLessThan(VN_MAP_ZOOM.ward);
    expect(VN_DEFAULT_ZOOM).toBeGreaterThanOrEqual(VN_MAP_ZOOM.min);
    expect(VN_DEFAULT_ZOOM).toBeLessThanOrEqual(VN_MAP_ZOOM.max);
  });
});
