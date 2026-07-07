import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayerManager } from '../src/core/LayerManager';
import type { IRenderer } from '../src/renderers/base/IRenderer';
import type { VNGeoJSONCollection } from '../src/types/api.types';

const geojson: VNGeoJSONCollection = {
  type: 'FeatureCollection',
  features: [],
};

function createMockRenderer(): IRenderer {
  return {
    initialize: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
    addGeoJSON: vi.fn((_g, _o, id?: string) => id ?? 'auto-id'),
    removeLayer: vi.fn(),
    setLayerStyle: vi.fn(),
    setLayerVisibility: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onLayerClick: vi.fn(),
    offLayerClick: vi.fn(),
    destroy: vi.fn(),
    isInitialized: true,
  };
}

describe('LayerManager', () => {
  let renderer: IRenderer;
  let manager: LayerManager;

  beforeEach(() => {
    renderer = createMockRenderer();
    manager = new LayerManager(renderer);
  });

  it('adds a layer and registers it', () => {
    const layer = manager.add('l1', 'provinces', geojson, { style: { fillColor: '#fff' } });
    expect(layer.id).toBe('l1');
    expect(layer.type).toBe('provinces');
    expect(layer.visible).toBe(true);
    expect(manager.has('l1')).toBe(true);
    expect(manager.size).toBe(1);
    expect(renderer.addGeoJSON).toHaveBeenCalledOnce();
  });

  it('replaces an existing layer with the same id', () => {
    manager.add('l1', 'provinces', geojson);
    manager.add('l1', 'provinces', geojson);
    expect(renderer.removeLayer).toHaveBeenCalledWith('l1');
    expect(manager.size).toBe(1);
  });

  it('removes a layer', () => {
    manager.add('l1', 'custom', geojson);
    expect(manager.remove('l1')).toBe(true);
    expect(manager.has('l1')).toBe(false);
    expect(manager.remove('missing')).toBe(false);
  });

  it('clears layers optionally filtered by type', () => {
    manager.add('p', 'provinces', geojson);
    manager.add('w', 'wards', geojson);
    manager.add('c', 'custom', geojson);
    manager.clear('wards');
    expect(manager.has('w')).toBe(false);
    expect(manager.size).toBe(2);
    manager.clear();
    expect(manager.size).toBe(0);
  });

  it('updates style and merges into registry', () => {
    manager.add('l1', 'provinces', geojson, { style: { fillColor: '#111' } });
    expect(manager.setStyle('l1', { strokeColor: '#222' })).toBe(true);
    expect(renderer.setLayerStyle).toHaveBeenCalledWith('l1', { strokeColor: '#222' });
    expect(manager.get('l1')?.style).toMatchObject({ fillColor: '#111', strokeColor: '#222' });
  });

  it('toggles visibility', () => {
    manager.add('l1', 'provinces', geojson);
    manager.toggle('l1');
    expect(manager.get('l1')?.visible).toBe(false);
    expect(renderer.setLayerVisibility).toHaveBeenCalledWith('l1', false);
    manager.toggle('l1');
    expect(manager.get('l1')?.visible).toBe(true);
  });

  it('lists layers filtered by type', () => {
    manager.add('p', 'provinces', geojson);
    manager.add('w1', 'wards', geojson);
    manager.add('w2', 'wards', geojson);
    expect(manager.list('wards')).toHaveLength(2);
    expect(manager.list()).toHaveLength(3);
  });
});
