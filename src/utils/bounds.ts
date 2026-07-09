/**
 * Vietnam map constants and bounds
 */

import type { BoundsTuple, LatLng } from '../types';

/** Vietnam geographic bounds: Southwest to Northeast */
export const VN_BOUNDS: BoundsTuple = [
  [8.18, 102.14], // Southwest corner [lat, lng]
  [23.24, 109.47], // Northeast corner [lat, lng]
];

/** Vietnam center point [lat, lng] */
export const VN_CENTER: LatLng = [14.0583, 108.2772];

/** Default zoom level when displaying whole Vietnam */
export const VN_DEFAULT_ZOOM = 6;

/** Minimum zoom level */
export const VN_MIN_ZOOM = 5;

/** Maximum zoom level */
export const VN_MAX_ZOOM = 18;

/** Zoom level for city/province view */
export const VN_CITY_ZOOM = 12;

/** Zoom level for district view */
export const VN_DISTRICT_ZOOM = 14;

/** Zoom level for ward/street view */
export const VN_STREET_ZOOM = 16;
