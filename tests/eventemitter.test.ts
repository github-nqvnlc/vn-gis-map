import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';

describe('EventEmitter', () => {
  it('registers and fires handlers with typed payload', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('click', handler);
    emitter.emit('click', { target: null, lngLat: [106, 16] });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ type: 'click', target: null, lngLat: [106, 16] });
  });

  it('supports multiple handlers for the same event', () => {
    const emitter = new EventEmitter();
    const a = vi.fn();
    const b = vi.fn();
    emitter.on('moveend', a);
    emitter.on('moveend', b);
    emitter.emit('moveend', { target: null });
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });

  it('removes a handler with off', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('zoomend', handler);
    emitter.off('zoomend', handler);
    emitter.emit('zoomend', { target: null });
    expect(handler).not.toHaveBeenCalled();
  });

  it('once only fires a single time', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.once('ready', handler);
    emitter.emit('ready', { target: null });
    emitter.emit('ready', { target: null });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('isolates errors thrown in handlers', () => {
    const emitter = new EventEmitter();
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    emitter.on('click', bad);
    emitter.on('click', good);
    expect(() => emitter.emit('click', { target: null })).not.toThrow();
    expect(good).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('removeAllListeners clears handlers', () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    emitter.on('click', handler);
    emitter.on('moveend', handler);
    emitter.removeAllListeners('click');
    emitter.emit('click', { target: null });
    expect(handler).not.toHaveBeenCalled();
    emitter.emit('moveend', { target: null });
    expect(handler).toHaveBeenCalledOnce();
    emitter.removeAllListeners();
    emitter.emit('moveend', { target: null });
    expect(handler).toHaveBeenCalledOnce();
  });
});
