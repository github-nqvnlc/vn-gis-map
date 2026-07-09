/**
 * Minimal typed event emitter
 */

type EventHandler = (payload: EventPayload) => void;

interface EventPayload {
  type: string;
  timestamp: number;
  data?: unknown;
}

export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.listeners.get(event)?.delete(handler);
    return this;
  }

  once(event: string, handler: EventHandler): this {
    const wrapper: EventHandler = (payload) => {
      handler(payload);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  emit(event: string, data?: unknown): void {
    const payload: EventPayload = {
      type: event,
      timestamp: Date.now(),
      data,
    };
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(payload);
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
