/**
 * Re-export standard GeoJSON types với các type helpers bổ sung
 */
export type {
  Feature,
  FeatureCollection,
  Geometry,
  GeometryCollection,
  Point,
  MultiPoint,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  GeoJsonProperties,
  BBox,
  Position,
} from 'geojson';

/**
 * Type guard kiểm tra đây có phải FeatureCollection không
 */
export function isFeatureCollection(obj: unknown): obj is GeoJSON.FeatureCollection {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>)['type'] === 'FeatureCollection'
  );
}

/**
 * Type guard kiểm tra đây có phải Feature không
 */
export function isFeature(obj: unknown): obj is GeoJSON.Feature {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>)['type'] === 'Feature'
  );
}
