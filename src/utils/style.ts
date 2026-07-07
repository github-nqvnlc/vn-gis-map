import type { LayerStyle } from '../types';

/**
 * Default style cho provinces layer
 */
export const DEFAULT_PROVINCE_STYLE: LayerStyle = {
  fillColor: '#4a90d9',
  fillOpacity: 0.2,
  strokeColor: '#2c6fad',
  strokeWidth: 1.5,
  hoverFillColor: '#4a90d9',
  hoverStrokeColor: '#1a4f8a',
};

/**
 * Default style cho wards layer
 */
export const DEFAULT_WARD_STYLE: LayerStyle = {
  fillColor: '#52c41a',
  fillOpacity: 0.2,
  strokeColor: '#389e0d',
  strokeWidth: 1,
  hoverFillColor: '#52c41a',
  hoverStrokeColor: '#237804',
};

/**
 * Default style cho custom GeoJSON layers
 */
export const DEFAULT_CUSTOM_STYLE: LayerStyle = {
  fillColor: '#eb5757',
  fillOpacity: 0.25,
  strokeColor: '#c0392b',
  strokeWidth: 1.5,
  hoverFillColor: '#eb5757',
  hoverStrokeColor: '#96281b',
};

/**
 * Preset style palettes dành cho choropleth maps hoặc custom themes
 */
export const VN_STYLE_PRESETS = {
  default: DEFAULT_PROVINCE_STYLE,
  blue: {
    fillColor: '#4a90d9',
    fillOpacity: 0.25,
    strokeColor: '#2c6fad',
    strokeWidth: 1.5,
    hoverFillColor: '#1677ff',
    hoverStrokeColor: '#0958d9',
  } satisfies LayerStyle,
  green: {
    fillColor: '#52c41a',
    fillOpacity: 0.25,
    strokeColor: '#389e0d',
    strokeWidth: 1.5,
    hoverFillColor: '#73d13d',
    hoverStrokeColor: '#237804',
  } satisfies LayerStyle,
  red: {
    fillColor: '#eb5757',
    fillOpacity: 0.25,
    strokeColor: '#c0392b',
    strokeWidth: 1.5,
    hoverFillColor: '#ff4d4f',
    hoverStrokeColor: '#a8071a',
  } satisfies LayerStyle,
  orange: {
    fillColor: '#fa8c16',
    fillOpacity: 0.25,
    strokeColor: '#d46b08',
    strokeWidth: 1.5,
    hoverFillColor: '#ffa940',
    hoverStrokeColor: '#ad4e00',
  } satisfies LayerStyle,
  purple: {
    fillColor: '#722ed1',
    fillOpacity: 0.2,
    strokeColor: '#531dab',
    strokeWidth: 1.5,
    hoverFillColor: '#9254de',
    hoverStrokeColor: '#391085',
  } satisfies LayerStyle,
} as const;

/**
 * Merge user style với default style
 */
export function mergeStyle(defaults: LayerStyle, overrides?: LayerStyle): LayerStyle {
  if (!overrides) return { ...defaults };
  return { ...defaults, ...overrides };
}
