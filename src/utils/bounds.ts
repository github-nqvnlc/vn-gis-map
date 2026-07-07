import type { Bounds, LngLat } from '../types';

/**
 * Bounds địa lý của Việt Nam (WGS84)
 */
export const VN_BOUNDS: {
  north: number;
  south: number;
  east: number;
  west: number;
  center: LngLat;
  asBounds: Bounds;
} = {
  north: 23.393395,
  south: 8.179199,
  east: 109.469229,
  west: 102.144598,
  center: [106.0, 16.0],
  asBounds: [
    [8.179199, 102.144598],
    [23.393395, 109.469229],
  ],
} as const;

/**
 * Zoom mặc định để hiển thị toàn bộ Việt Nam
 */
export const VN_DEFAULT_ZOOM = 6;

/**
 * Trung tâm Việt Nam (Leaflet dùng [lat, lng], chú ý thứ tự)
 */
export const VN_CENTER_LATLNG: [number, number] = [16.0, 106.0];

/**
 * Trung tâm Việt Nam theo format [lng, lat] (MapLibre)
 */
export const VN_CENTER_LNGLAT: LngLat = [106.0, 16.0];

/**
 * Min/max zoom hợp lệ
 */
export const VN_MAP_ZOOM = {
  min: 4,
  max: 18,
  province: 8,
  ward: 11,
} as const;
