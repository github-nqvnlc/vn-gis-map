# Hướng dẫn sử dụng với các Framework - @vn-gis/map v2.0.0

## Mục lục

1. [Vanilla JavaScript](#vanilla-javascript)
2. [React](#react)
3. [Next.js](#nextjs)
4. [Vue.js](#vuejs)
5. [TypeScript](#typescript)

---

## Vanilla JavaScript

### Cài đặt

```bash
npm install @vn-gis/map
# hoặc
yarn add @vn-gis/map
```

### Ví dụ đơn giản

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VN GIS Map - Vanilla JS</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    #map { height: 100vh; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script type="module">
    import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

    const map = new VNGisMap({
      container: 'map',
      renderer: 'leaflet',
      center: VN_CENTER,
      zoom: 6,
      bounds: VN_BOUNDS,
    });

    // Thêm marker
    map.addLayer('hanoi', 'marker', {
      lat: 21.0285,
      lng: 105.8542,
      title: 'Hà Nội',
      popup: '<strong>Hà Nội</strong><br/>Thủ đô Việt Nam',
    });

    // Lắng nghe sự kiện
    map.on('click', (payload) => {
      console.log('Click tại:', payload.data.lat, payload.data.lng);
    });

    // Khi bản đồ sẵn sàng
    map.once('ready', () => {
      console.log('Bản đồ đã sẵn sàng!');
    });
  </script>
</body>
</html>
```

### Sử dụng với Module Bundlers

```javascript
// main.js
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

const map = new VNGisMap({
  container: 'map',
  renderer: 'leaflet',
  center: VN_CENTER,
  zoom: 6,
});

export default map;
```

---

## React

### Cài đặt

```bash
npm install @vn-gis/map leaflet react-leaflet
# hoặc
yarn add @vn-gis/map leaflet react-leaflet
```

### Component Hook

```tsx
// hooks/useVNGisMap.ts
import { useEffect, useRef, useState } from 'react';
import { VNGisMap, MapConfig, MapOptions } from '@vn-gis/map';

interface UseVNGisMapOptions extends MapConfig {
  onReady?: () => void;
  onClick?: (data: { lat: number; lng: number }) => void;
}

export function useVNGisMap(options: UseVNGisMapOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapOptions, setMapOptions] = useState<MapOptions | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new VNGisMap({
      container: containerRef.current,
      ...options,
    });

    mapRef.current = map;

    map.on('ready', () => {
      setIsReady(true);
      setMapOptions(map.getOptions());
      options.onReady?.();
    });

    if (options.onClick) {
      map.on('click', (payload) => {
        options.onClick?.({
          lat: payload.data?.lat ?? 0,
          lng: payload.data?.lng ?? 0,
        });
      });
    }

    return () => {
      map.destroy();
    };
  }, []);

  return {
    containerRef,
    map: mapRef.current,
    isReady,
    mapOptions,
    addLayer: mapRef.current?.addLayer.bind(mapRef.current),
    removeLayer: mapRef.current?.removeLayer.bind(mapRef.current),
    setView: mapRef.current?.setView.bind(mapRef.current),
    fitBounds: mapRef.current?.fitBounds.bind(mapRef.current),
  };
}
```

### Sử dụng Component

```tsx
// components/VietnamMap.tsx
import React, { useState } from 'react';
import { useVNGisMap, MapOptions } from '../hooks/useVNGisMap';
import { VN_CENTER, VN_BOUNDS } from '@vn-gis/map';
import { LayerType, MarkerOptions, PolygonOptions } from '@vn-gis/map';

interface VietnamMapProps {
  initialCenter?: [number, number];
  initialZoom?: number;
}

export function VietnamMap({ 
  initialCenter = VN_CENTER, 
  initialZoom = 6 
}: VietnamMapProps) {
  const { containerRef, isReady, addLayer, removeLayer, setView } = useVNGisMap({
    container: 'map-container',
    renderer: 'leaflet',
    center: initialCenter,
    zoom: initialZoom,
    bounds: VN_BOUNDS,
    onClick: (data) => {
      console.log('Clicked:', data);
    },
  });

  const handleAddMarker = () => {
    addLayer?.('test-marker', 'marker', {
      lat: 21.0285,
      lng: 105.8542,
      title: 'Hà Nội',
      popup: '<strong>Hà Nội</strong>',
    });
  };

  const handleGoToHanoi = () => {
    setView?.([21.0285, 105.8542], 12);
  };

  return (
    <div className="map-wrapper">
      <div 
        ref={containerRef} 
        id="map-container" 
        style={{ height: '500px', width: '100%' }} 
      />
      
      {isReady && (
        <div className="controls">
          <button onClick={handleAddMarker}>Thêm Marker</button>
          <button onClick={handleGoToHanoi}>Đến Hà Nội</button>
        </div>
      )}
    </div>
  );
}

export default VietnamMap;
```

### Sử dụng với React (Class Component)

```tsx
// components/MapComponent.tsx
import React, { Component } from 'react';
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';
import { MapOptions } from '@vn-gis/map';

interface MapComponentState {
  isReady: boolean;
  mapOptions: MapOptions | null;
}

export class MapComponent extends Component<{}, MapComponentState> {
  private map: VNGisMap | null = null;
  private containerRef = React.createRef<HTMLDivElement>();

  state: MapComponentState = {
    isReady: false,
    mapOptions: null,
  };

  componentDidMount() {
    if (!this.containerRef.current) return;

    this.map = new VNGisMap({
      container: this.containerRef.current,
      renderer: 'leaflet',
      center: VN_CENTER,
      zoom: 6,
      bounds: VN_BOUNDS,
    });

    this.map.on('ready', () => {
      this.setState({
        isReady: true,
        mapOptions: this.map?.getOptions() ?? null,
      });
    });

    this.map.on('click', (payload) => {
      console.log('Click:', payload.data);
    });
  }

  componentWillUnmount() {
    this.map?.destroy();
  }

  addMarker = (id: string, lat: number, lng: number, title: string) => {
    this.map?.addLayer(id, 'marker', { lat, lng, title });
  };

  removeLayer = (id: string) => {
    this.map?.removeLayer(id);
  };

  setView = (center: [number, number], zoom?: number) => {
    this.map?.setView(center, zoom);
  };

  render() {
    return (
      <div>
        <div 
          ref={this.containerRef} 
          style={{ height: '500px', width: '100%' }} 
        />
        {this.state.isReady && (
          <div className="controls">
            <button onClick={() => this.addMarker('m1', 21.0285, 105.8542, 'Hà Nội')}>
              Thêm Marker
            </button>
          </div>
        )}
      </div>
    );
  }
}

export default MapComponent;
```

---

## Next.js

### Cài đặt

```bash
npm install @vn-gis/map leaflet
# hoặc
yarn add @vn-gis/map leaflet
```

### Cấu hình

**next.config.js** - Để import CSS của Leaflet:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vn-gis/map'],
  webpack: (config) => {
    // Xử lý Leaflet CSS
    config.module.rules.push({
      test: /\.css$/,
      include: /node_modules/,
      use: ['style-loader', 'css-loader'],
    });
    return config;
  },
};

module.exports = nextConfig;
```

### Sử dụng với App Router (Next.js 14+)

```tsx
// app/components/VietnamMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

export default function VietnamMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Import CSS của Leaflet
    import('leaflet/dist/leaflet.css');

    const map = new VNGisMap({
      container: containerRef.current,
      renderer: 'leaflet',
      center: VN_CENTER,
      zoom: 6,
      bounds: VN_BOUNDS,
    });

    mapRef.current = map;

    map.on('ready', () => {
      setIsReady(true);
    });

    map.on('click', (payload) => {
      console.log('Clicked:', payload.data);
    });

    return () => {
      map.destroy();
      mapRef.current = null;
    };
  }, []);

  const addMarker = (lat: number, lng: number, title: string) => {
    const id = `marker-${Date.now()}`;
    mapRef.current?.addLayer(id, 'marker', {
      lat,
      lng,
      title,
      popup: `<strong>${title}</strong>`,
    });
  };

  const goToLocation = (lat: number, lng: number, zoom = 12) => {
    mapRef.current?.setView([lat, lng], zoom);
  };

  return (
    <div className="space-y-4">
      <div 
        ref={containerRef} 
        className="h-[500px] w-full rounded-lg overflow-hidden"
      />
      
      <div className="flex gap-2">
        <button
          onClick={() => addMarker(21.0285, 105.8542, 'Hà Nội')}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Thêm Marker Hà Nội
        </button>
        <button
          onClick={() => goToLocation(21.0285, 105.8542)}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Đến Hà Nội
        </button>
        <button
          onClick={() => goToLocation(10.8231, 106.6297)}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Đến TP.HCM
        </button>
      </div>
    </div>
  );
}
```

### Sử dụng với Pages Router

```tsx
// pages/map.tsx
import { useEffect, useRef, useState } from 'react';
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    import('leaflet/dist/leaflet.css');

    const map = new VNGisMap({
      container: containerRef.current,
      renderer: 'leaflet',
      center: VN_CENTER,
      zoom: 6,
      bounds: VN_BOUNDS,
    });

    mapRef.current = map;
    setIsLoaded(true);

    return () => map.destroy();
  }, []);

  const addProvinceMarkers = () => {
    const provinces = [
      { name: 'Hà Nội', lat: 21.0285, lng: 105.8542 },
      { name: 'TP.HCM', lat: 10.8231, lng: 106.6297 },
      { name: 'Đà Nẵng', lat: 16.0544, lng: 108.2022 },
      { name: 'Hải Phòng', lat: 20.8449, lng: 106.6881 },
      { name: 'Cần Thơ', lat: 10.0341, lng: 105.7222 },
    ];

    provinces.forEach(({ name, lat, lng }) => {
      mapRef.current?.addLayer(`province-${name}`, 'marker', {
        lat,
        lng,
        title: name,
        popup: `<strong>${name}</strong>`,
      });
    });
  };

  return (
    <div>
      <h1>Bản đồ Việt Nam</h1>
      <div ref={containerRef} style={{ height: '600px' }} />
      {isLoaded && (
        <button onClick={addProvinceMarkers}>Thêm markers tỉnh/thành</button>
      )}
    </div>
  );
}
```

---

## Vue.js

### Cài đặt

```bash
npm install @vn-gis/map leaflet
# hoặc
yarn add @vn-gis/map leaflet
```

### Component Composition API

```vue
<!-- components/VietnamMap.vue -->
<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container" />
    
    <div v-if="isReady" class="controls">
      <button @click="addMarker">Thêm Marker</button>
      <button @click="goToHanoi">Đến Hà Nội</button>
      <button @click="goToHCMC">Đến TP.HCM</button>
      <button @click="clearAll">Xóa tất cả</button>
    </div>
    
    <div v-if="clickInfo" class="info">
      Click tại: {{ clickInfo.lat.toFixed(4) }}, {{ clickInfo.lng.toFixed(4) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';
import type { VNGisMap as VNGisMapType } from '@vn-gis/map';

const mapContainer = ref<HTMLDivElement | null>(null);
const isReady = ref(false);
const clickInfo = ref<{ lat: number; lng: number } | null>(null);

let map: VNGisMapType | null = null;
const layers: string[] = [];

onMounted(async () => {
  if (!mapContainer.value) return;

  // Import CSS của Leaflet
  await import('leaflet/dist/leaflet.css');

  map = new VNGisMap({
    container: mapContainer.value,
    renderer: 'leaflet',
    center: VN_CENTER,
    zoom: 6,
    bounds: VN_BOUNDS,
  });

  map.on('ready', () => {
    isReady.value = true;
  });

  map.on('click', (payload) => {
    if (payload.data) {
      clickInfo.value = {
        lat: payload.data.lat ?? 0,
        lng: payload.data.lng ?? 0,
      };
    }
  });
});

onUnmounted(() => {
  map?.destroy();
});

const addMarker = () => {
  if (!map) return;
  const id = `marker-${Date.now()}`;
  map.addLayer(id, 'marker', {
    lat: 21.0285,
    lng: 105.8542,
    title: 'Hà Nội',
    popup: '<strong>Hà Nội</strong><br/>Thủ đô Việt Nam',
  });
  layers.push(id);
};

const goToHanoi = () => {
  map?.setView([21.0285, 105.8542], 12);
};

const goToHCMC = () => {
  map?.setView([10.8231, 106.6297], 12);
};

const clearAll = () => {
  layers.forEach((id) => map?.removeLayer(id));
  layers.length = 0;
};

defineExpose({
  addMarker,
  goToHanoi,
  goToHCMC,
  clearAll,
});
</script>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
}

.controls {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.controls button {
  padding: 0.5rem 1rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.controls button:hover {
  background: #2c6fad;
}

.info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
```

### Sử dụng Component

```vue
<!-- App.vue -->
<template>
  <div class="app">
    <h1>Bản đồ Việt Nam</h1>
    <VietnamMap ref="mapRef" />
  </div>
</template>

<script setup lang="ts">
import VietnamMap from './components/VietnamMap.vue';
</script>
```

### Vue 2 Component

```vue
<!-- components/VietnamMap.vue (Vue 2) -->
<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="map-container" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

export default defineComponent({
  name: 'VietnamMap',
  
  setup() {
    const mapContainer = ref<HTMLDivElement | null>(null);
    let map: VNGisMap | null = null;
    const layers: string[] = [];

    const addMarker = (lat: number, lng: number, title: string) => {
      if (!map) return;
      const id = `marker-${Date.now()}`;
      map.addLayer(id, 'marker', { lat, lng, title });
      layers.push(id);
    };

    const removeLayer = (id: string) => {
      map?.removeLayer(id);
    };

    const clearAll = () => {
      layers.forEach((id) => map?.removeLayer(id));
      layers.length = 0;
    };

    onMounted(async () => {
      if (!mapContainer.value) return;

      await import('leaflet/dist/leaflet.css');

      map = new VNGisMap({
        container: mapContainer.value,
        renderer: 'leaflet',
        center: VN_CENTER,
        zoom: 6,
        bounds: VN_BOUNDS,
      });

      map.on('click', (payload) => {
        console.log('Click:', payload.data);
      });
    });

    onBeforeUnmount(() => {
      map?.destroy();
    });

    return {
      mapContainer,
      addMarker,
      removeLayer,
      clearAll,
    };
  },
});
</script>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
}
</style>
```

---

## TypeScript

### Kiểu dữ liệu đầy đủ

```typescript
import {
  VNGisMap,
  MapConfig,
  MapOptions,
  LatLng,
  BoundsTuple,
  LayerType,
  LayerOptions,
  MarkerOptions,
  PolygonOptions,
  GeoJSONOptions,
  VN_CENTER,
  VN_BOUNDS,
} from '@vn-gis/map';

// Cấu hình
const config: MapConfig = {
  container: 'map',
  renderer: 'leaflet',
  center: VN_CENTER,
  zoom: 6,
  minZoom: 5,
  maxZoom: 18,
  bounds: VN_BOUNDS,
  scrollWheelZoom: true,
};

// Tạo bản đồ
const map = new VNGisMap(config);

// Các kiểu layer
const markerOptions: MarkerOptions = {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Hà Nội',
  popup: '<strong>Hà Nội</strong>',
};

const polygonOptions: PolygonOptions = {
  coordinates: [
    [21.0, 105.8],
    [21.1, 105.9],
    [21.0, 105.9],
  ],
  color: '#ff5722',
  fillColor: '#ff5722',
  fillOpacity: 0.3,
  weight: 2,
};

const geojsonOptions: GeoJSONOptions = {
  data: {
    type: 'FeatureCollection',
    features: [],
  },
  style: {
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.2,
    weight: 2,
  },
};

// Sử dụng
map.addLayer('marker-1', 'marker', markerOptions);
map.addLayer('polygon-1', 'polygon', polygonOptions);
map.addLayer('geojson-1', 'geojson', geojsonOptions);

// Event handler với type safety
map.on('click', (payload) => {
  const { lat, lng } = payload.data as { lat: number; lng: number };
  console.log(`Click tại: ${lat}, ${lng}`);
});

map.on('ready', () => {
  console.log('Bản đồ sẵn sàng');
});
```

### Custom Hook cho React với TypeScript

```typescript
// hooks/useVNGisMap.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  VNGisMap, 
  MapConfig, 
  MapOptions,
  LayerType,
  LayerOptions,
  LatLng,
  BoundsTuple,
} from '@vn-gis/map';

interface UseVNGisMapResult {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  mapOptions: MapOptions | null;
  addLayer: (id: string, type: LayerType, options: LayerOptions) => void;
  removeLayer: (id: string) => void;
  setView: (center: LatLng, zoom?: number) => void;
  fitBounds: (bounds: BoundsTuple) => void;
}

export function useVNGisMap(config: MapConfig): UseVNGisMapResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mapOptions, setMapOptions] = useState<MapOptions | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new VNGisMap({
      container: containerRef.current,
      ...config,
    });

    mapRef.current = map;

    map.on('ready', () => {
      setIsReady(true);
      setMapOptions(map.getOptions());
    });

    return () => {
      map.destroy();
      mapRef.current = null;
    };
  }, []);

  const addLayer = useCallback((id: string, type: LayerType, options: LayerOptions) => {
    mapRef.current?.addLayer(id, type, options);
  }, []);

  const removeLayer = useCallback((id: string) => {
    mapRef.current?.removeLayer(id);
  }, []);

  const setView = useCallback((center: LatLng, zoom?: number) => {
    mapRef.current?.setView(center, zoom);
  }, []);

  const fitBounds = useCallback((bounds: BoundsTuple) => {
    mapRef.current?.fitBounds(bounds);
  }, []);

  return {
    containerRef,
    isReady,
    mapOptions,
    addLayer,
    removeLayer,
    setView,
    fitBounds,
  };
}
```

---

## Best Practices

### 1. Import CSS đúng cách

```typescript
// Trong React/Next.js/Vue - Import CSS trong useEffect
useEffect(() => {
  import('leaflet/dist/leaflet.css');
  // ... khởi tạo bản đồ
}, []);
```

### 2. Cleanup đúng cách

```typescript
// Luôn destroy map khi component unmount
useEffect(() => {
  const map = new VNGisMap({ ... });
  
  return () => {
    map.destroy();
  };
}, []);
```

### 3. Sử dụng refs thay vì state cho map instance

```typescript
// ❌ Bad - có thể gây re-render không cần thiết
const [map, setMap] = useState<VNGisMap | null>(null);

// ✅ Good - dùng ref
const mapRef = useRef<VNGisMap | null>(null);
```

### 4. Xử lý SSR (Server-Side Rendering)

```typescript
// Next.js/Vue SSR
useEffect(() => {
  if (typeof window === 'undefined') return;
  
  const map = new VNGisMap({ ... });
  // ...
}, []);
```

---

## Troubleshooting

### Lỗi "Container not found"

```typescript
// ❌ Sai - container chưa tồn tại
const map = new VNGisMap({
  container: document.getElementById('map')!,
});

// ✅ Đúng - đợi container render
useEffect(() => {
  if (!containerRef.current) return;
  const map = new VNGisMap({
    container: containerRef.current,
  });
}, []);
```

### Lỗi CSS Leaflet không load

```typescript
// Import CSS thủ công
import 'leaflet/dist/leaflet.css';
```

### Lỗi "Map is not defined"

```typescript
// Dynamic import cho Leaflet/MapLibre
import('leaflet').then(() => {
  const map = new VNGisMap({ ... });
});
```
