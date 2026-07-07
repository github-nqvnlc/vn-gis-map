import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROVINCE_STYLE,
  DEFAULT_WARD_STYLE,
  DEFAULT_CUSTOM_STYLE,
  VN_STYLE_PRESETS,
  mergeStyle,
} from '../src/utils/style';

describe('mergeStyle', () => {
  it('returns a clone of defaults when no overrides', () => {
    const result = mergeStyle(DEFAULT_PROVINCE_STYLE);
    expect(result).toEqual(DEFAULT_PROVINCE_STYLE);
    expect(result).not.toBe(DEFAULT_PROVINCE_STYLE);
  });

  it('overrides only provided keys', () => {
    const result = mergeStyle(DEFAULT_PROVINCE_STYLE, { fillColor: '#000000' });
    expect(result.fillColor).toBe('#000000');
    expect(result.strokeColor).toBe(DEFAULT_PROVINCE_STYLE.strokeColor);
  });

  it('does not mutate the defaults object', () => {
    const before = { ...DEFAULT_WARD_STYLE };
    mergeStyle(DEFAULT_WARD_STYLE, { fillOpacity: 0.9 });
    expect(DEFAULT_WARD_STYLE).toEqual(before);
  });
});

describe('style presets', () => {
  it('exposes named palettes', () => {
    expect(VN_STYLE_PRESETS.blue.fillColor).toBeDefined();
    expect(VN_STYLE_PRESETS.green.strokeColor).toBeDefined();
    expect(VN_STYLE_PRESETS.red.hoverFillColor).toBeDefined();
  });

  it('default preset equals province style', () => {
    expect(VN_STYLE_PRESETS.default).toBe(DEFAULT_PROVINCE_STYLE);
  });

  it('custom style has distinct color', () => {
    expect(DEFAULT_CUSTOM_STYLE.fillColor).not.toBe(DEFAULT_PROVINCE_STYLE.fillColor);
  });
});
