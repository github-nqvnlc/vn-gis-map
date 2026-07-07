import type { MapEvent, MapEventPayload, EventHandler } from '../types';

/**
 * Minimal typed event emitter
 */
export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler);
    return this;
  }

  off<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    this.listeners.get(event)?.delete(handler as EventHandler);
    return this;
  }

  once<T = unknown>(event: MapEvent | string, handler: EventHandler<T>): this {
    const wrapper: EventHandler<T> = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit<T = unknown>(event: MapEvent | string, payload: Omit<MapEventPayload<T>, 'type'>): void {
    const fullPayload: MapEventPayload<T> = { ...payload, type: event as MapEvent };
    this.listeners.get(event)?.forEach((handler) => {
      try {
        (handler as EventHandler<T>)(fullPayload);
      } catch (err) {
        console.error(`[VNGisMap] Error in event handler for "${event}":`, err);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
