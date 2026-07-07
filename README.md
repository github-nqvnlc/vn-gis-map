# @vn-gis/map

Thư viện TypeScript hiển thị bản đồ GIS hành chính Việt Nam: tỉnh/thành, xã/phường và custom GeoJSON layers. Tích hợp sẵn với [vn-gis-api](https://github.com/vn-gis), hỗ trợ **Leaflet** và **MapLibre GL JS**.

---

## Tính năng

- Hiển thị toàn bộ tỉnh/thành, xã/phường Việt Nam
- Custom GeoJSON layers từ URL hoặc data inline
- Reverse geocoding (toạ độ → xã/phường/tỉnh)
- Chọn renderer: **Leaflet** hoặc **MapLibre GL JS**
- Style tĩnh, style động (theo feature), popup và tooltip
- Auth: token trực tiếp hoặc username/password → auto-login
- Cache HTTP theo TTL, TypeScript declarations đầy đủ
- Bundle ESM / CJS / UMD

---

## Cài đặt

```bash
npm install @vn-gis/map
```

Cài **một** trong hai renderer (peer dependency):

```bash
# Leaflet
npm install leaflet

# Hoặc MapLibre
npm install maplibre-gl
```

---

## Bắt đầu nhanh

### Leaflet

```ts
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: 'https://api.example.com',
    token: 'YOUR_TOKEN',
    layers: { provinces: true },
  },
  () => new LeafletRenderer(L),
);
```

### MapLibre

```ts
import { VNGisMap } from '@vn-gis/map';
import { MapLibreRenderer } from '@vn-gis/map/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const map = new VNGisMap(
  {
    container: 'map',
    renderer: 'maplibre',
    apiBaseUrl: 'https://api.example.com',
    token: 'YOUR_TOKEN',
    layers: { provinces: true },
  },
  () => new MapLibreRenderer(maplibregl),
);
```

---

## Cấu hình `VNMapConfig`

| Thuộc tính | Kiểu | Mô tả |
|---|---|---|
| `container` | `string \| HTMLElement` | Element hoặc CSS selector chứa map |
| `renderer` | `'leaflet' \| 'maplibre'` | Loại renderer |
| `apiBaseUrl` | `string` | Base URL của vn-gis-api |
| `token` | `string?` | Bearer token (hoặc dùng `username`/`password`) |
| `username` | `string?` | Email đăng nhập (kết hợp với `password`) |
| `password` | `string?` | Mật khẩu (kết hợp với `username`) |
| `initialView` | `{ center: LngLat; zoom: number }` | View ban đầu |
| `initialBounds` | `Bounds` | Fit bounds khi khởi tạo |
| `layers` | `InitialLayers` | Layers nạp sẵn khi ready |
| `tileUrl` | `string` | Base tiles URL (mặc định: OSM) |
| `attribution` | `string` | Attribution |
| `cacheTtl` | `number` | TTL cache API (giây, mặc định 600) |
| `onProvinceClick` | `(feature) => void` | Click tỉnh |
| `onWardClick` | `(feature) => void` | Click xã/phường |
| `onCustomLayerClick` | `(feature, layerId) => void` | Click custom layer |

---

## Layers

### Hiển thị tỉnh/thành

```ts
// Style mặc định
await map.showProvinces();

// Style tuỳ chỉnh
await map.showProvinces({
  style: { fillColor: '#4a90d9', fillOpacity: 0.6 },
});

// Style động theo feature
await map.showProvinces({
  styleFunction: (feature) => {
    const area = Number(feature.properties?.area_km2 ?? 0);
    return { fillColor: area > 5000 ? '#c0392b' : '#4a90d9' };
  },
});

map.hideProvinces();
```

### Hiển thị xã/phường

```ts
// Tất cả xã/phường toàn quốc
await map.showWards();

// Chỉ xã/phường thuộc một tỉnh (theo mã tỉnh)
await map.showWards('01'); // Hà Nội

map.hideWards('01');
```

### Custom GeoJSON layers

```ts
// Từ URL
const id = await map.addCustomLayer('https://cdn.example.com/rivers.geojson');

// Từ data inline
const id2 = await map.addCustomLayer(geojsonObject, {
  style: { strokeColor: '#f00', lineWidth: 2 },
});
```

### Quản lý layer

```ts
// Đổi style layer
map.setLayerStyle(id, { fillColor: '#00ff00', fillOpacity: 0.8 });

// Ẩn/hiện layer
map.setLayerVisibility(id, false);

// Toggle visibility
map.toggleLayer(id);

// Xoá layer
map.removeLayer(id);

// Ẩn/hide tất cả
map.hideProvinces();
map.hideWards();
```

---

## Reverse geocoding

Tìm xã/phường/tỉnh chứa toạ độ:

```ts
const result = await map.reverseGeocode(105.85, 21.02);

if (result.found) {
  console.log(result.ward?.province_name);  // "Hà Nội"
  console.log(result.ward?.ward_name);       // "Thạch Đà"
  console.log(result.ward?.ward_full_name);  // "Xã Thạch Đà, Huyện Thanh Trì, Thành phố Hà Nội"
}
```

---

## Navigation

```ts
// Di chuyển map tới vị trí
map.setView([105.85, 21.02], 12); // [lng, lat], zoom

// Fit bounds để hiển thị khu vực
map.fitBounds([
  [8.18, 102.14], // [south, west]
  [23.39, 109.47], // [north, east]
]);

// Zoom in/out
map.zoomIn();
map.zoomOut();
```

---

## Popup & Tooltip

```ts
await map.showProvinces({
  popup: {
    contentTemplate: (f) =>
      `<b>${f.properties?.name}</b><br>Mã: ${f.properties?.code}`,
  },
  tooltip: {
    contentTemplate: (f) => f.properties?.name ?? '',
  },
});
```

---

## Events

```ts
// Lắng nghe event
map.on('ready', () => console.log('Map sẵn sàng'));
map.on('click', (e) => console.log(e.lngLat, e.feature));
map.on('mousemove', (e) => console.log(e.lngLat));

// Chỉ chạy một lần
map.once('load', () => console.log('Load xong'));

// Huỷ listener
map.off('click', handler);

// Event types: ready, load, click, mousemove, zoomstart, zoomend, movestart, moveend, error
```

---

## Auth — Đăng nhập & Kiểm tra credentials

### Cách 1: Cung cấp token trực tiếp

```ts
new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: 'https://api.example.com',
    token: 'YOUR_TOKEN',
  },
  () => new LeafletRenderer(L),
);
```

### Cách 2: Đăng nhập bằng username + password

Nếu không có token, cung cấp `username` + `password`. Thư viện tự động gọi `POST /v1/auth/login` để lấy JWT khi gọi API đầu tiên:

```ts
new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: 'https://api.example.com',
    username: 'user@example.com',
    password: 'your-password',
  },
  () => new LeafletRenderer(L),
);
```

### Kiểm tra credentials trước khi khởi tạo

```ts
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  username: 'user@example.com',
  password: 'your-password',
});

const result = await client.validate();
if (!result.valid) {
  console.error(result.reason); // "Token không hợp lệ..."
  return;
}

const map = new VNGisMap(config, () => new LeafletRenderer(L));
```

### Gọi login thủ công

```ts
const result = await client.login(
  'https://api.example.com',
  'user@example.com',
  'password',
);
// result.accessToken — JWT string
// result.user        — { id, email, role }
// result.expiresIn   — vd: '7d'
```

### ValidateResult

| Trường | Mô tả |
|---|---|
| `valid` | `true` = token hợp lệ |
| `user` | `{ id, email, role }` khi `valid = true` |
| `reason` | Thông báo lỗi tiếng Việt khi `valid = false` |

### LoginResult

| Trường | Mô tả |
|---|---|
| `accessToken` | JWT string |
| `user` | `{ id, email, role }` |
| `expiresIn` | Thời hạn, vd: `'7d'` |

---

## Tích hợp Framework

### React

#### 1. Component map đơn giản

```tsx
import { useEffect, useRef, useState } from 'react';
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VNGisMapProps {
  apiBaseUrl: string;
  token: string;
  initialLayers?: { provinces?: boolean; wards?: boolean };
}

export function VietnamMap({ apiBaseUrl, token, initialLayers }: VNGisMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new VNGisMap(
      {
        container: containerRef.current,
        renderer: 'leaflet',
        apiBaseUrl,
        token,
        layers: initialLayers,
        onProvinceClick: (f) => console.log('Tỉnh:', f.properties?.name),
      },
      () => new LeafletRenderer(L),
    );

    mapRef.current = map;

    return () => map.destroy();
  }, [apiBaseUrl, token]);

  return <div ref={containerRef} style={{ height: '500px', width: '100%' }} />;
}
```

#### 2. Hook `useVNGisMap` — quản lý map state

```tsx
import { useEffect, useRef, useState } from 'react';
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function useVNGisMap(config: {
  apiBaseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  initialLayers?: { provinces?: boolean };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initMap = () => {
    if (!containerRef.current) return;

    const map = new VNGisMap(
      {
        container: containerRef.current,
        renderer: 'leaflet',
        apiBaseUrl: config.apiBaseUrl,
        token: config.token,
        username: config.username,
        password: config.password,
        layers: config.initialLayers,
      },
      () => new LeafletRenderer(L),
    );

    map.on('ready', () => setIsReady(true));
    map.on('error', (e) => setError(e.message ?? 'Unknown error'));
    mapRef.current = map;
  };

  useEffect(() => {
    initMap();
    return () => mapRef.current?.destroy();
  }, [config.apiBaseUrl, config.token, config.username, config.password]);

  return {
    containerRef,
    map: mapRef.current,
    isReady,
    error,
    showProvinces: (opts?: object) => mapRef.current?.showProvinces(opts),
    showWards: (code?: string) => mapRef.current?.showWards(code),
    setView: (lng: number, lat: number, zoom?: number) =>
      mapRef.current?.setView([lng, lat], zoom ?? 10),
    fitBounds: (bounds: [[number, number], [number, number]]) =>
      mapRef.current?.fitBounds(bounds),
    reverseGeocode: (lng: number, lat: number) =>
      mapRef.current?.reverseGeocode(lng, lat),
    destroy: () => mapRef.current?.destroy(),
  };
}

// --- Cách dùng ---
export function MapPage() {
  const { containerRef, isReady, error, showProvinces, setView } = useVNGisMap({
    apiBaseUrl: 'https://api.example.com',
    token: 'YOUR_TOKEN',
    initialLayers: { provinces: true },
  });

  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div>
      {!isReady && <div>Đang tải bản đồ...</div>}
      <div ref={containerRef} style={{ height: '600px' }} />
      <button onClick={() => setView(105.85, 21.02, 12)}>Đến Hà Nội</button>
    </div>
  );
}
```

#### 3. Form đăng nhập + Map

```tsx
import { useState } from 'react';
import { ApiClient } from '@vn-gis/map';

interface LoginFormProps {
  apiBaseUrl: string;
  onLogin: (token: string) => void;
}

export function LoginForm({ apiBaseUrl, onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const client = new ApiClient({ baseUrl: apiBaseUrl });
    const result = await client.login(apiBaseUrl, email, password);

    if (!result) {
      setError('Đăng nhập thất bại');
      setLoading(false);
      return;
    }

    onLogin(result.accessToken);
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Mật khẩu"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </button>
    </form>
  );
}

// --- App ---
export function App() {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    return (
      <LoginForm
        apiBaseUrl="https://api.example.com"
        onLogin={setToken}
      />
    );
  }

  return (
    <VietnamMap
      apiBaseUrl="https://api.example.com"
      token={token}
      initialLayers={{ provinces: true }}
    />
  );
}
```

---

### Next.js

#### Server Components — lấy token bảo mật qua API Route

**`app/api/auth/login/route.ts`** (API Route — server-side):

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  const response = await fetch(`${process.env.VN_GIS_API_URL}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Login failed' }, { status: 401 });
  }

  const { accessToken, user } = await response.json();

  return NextResponse.json({ accessToken, user });
}
```

**`app/api/auth/me/route.ts`** (kiểm tra session):

```ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await fetch(`${process.env.VN_GIS_API_URL}/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  return NextResponse.json(await response.json());
}
```

**`app/page.tsx`** (Client Component):

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Lấy token từ API Route (server-side, không expose secret)
async function getToken(): Promise<string> {
  // Token có thể được lưu trong httpOnly cookie hoặc session storage
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem('token') : null;
  if (stored) return stored;
  throw new Error('No token');
}

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    getToken()
      .then((token) => {
        const map = new VNGisMap(
          {
            container: containerRef.current!,
            renderer: 'leaflet',
            apiBaseUrl: process.env.NEXT_PUBLIC_VN_GIS_API_URL!,
            token,
            layers: { provinces: true },
            onProvinceClick: (f) =>
              console.log('Mã tỉnh:', f.properties?.code, 'Tên:', f.properties?.name),
          },
          () => new LeafletRenderer(L),
        );
        mapRef.current = map;
      })
      .catch((err) => setError(err.message));

    return () => mapRef.current?.destroy();
  }, []);

  if (error) return <div>Lỗi: {error}</div>;

  return <div ref={containerRef} style={{ height: '100vh' }} />;
}
```

#### Middleware bảo vệ route

**`middleware.ts`**:

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('session')?.value;

  if (!token && req.nextUrl.pathname.startsWith('/map')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/map/:path*'],
};
```

---

### Vue 3

#### 1. Composable `useVNGisMap`

**`composables/useVNGisMap.ts`**:

```ts
import { onMounted, onUnmounted, ref } from 'vue';
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function useVNGisMap(options: {
  apiBaseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  initialLayers?: { provinces?: boolean };
}) {
  const containerRef = ref<HTMLElement | null>(null);
  const mapInstance = ref<VNGisMap | null>(null);
  const isReady = ref(false);
  const error = ref<string | null>(null);

  onMounted(() => {
    if (!containerRef.value) return;

    try {
      const map = new VNGisMap(
        {
          container: containerRef.value,
          renderer: 'leaflet',
          apiBaseUrl: options.apiBaseUrl,
          token: options.token,
          username: options.username,
          password: options.password,
          layers: options.initialLayers,
          onProvinceClick: (f) =>
            console.log('Tỉnh:', f.properties?.name),
        },
        () => new LeafletRenderer(L),
      );

      map.on('ready', () => (isReady.value = true));
      map.on('error', (e) => (error.value = e.message ?? 'Unknown error'));
      mapInstance.value = map;
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  });

  onUnmounted(() => {
    mapInstance.value?.destroy();
  });

  const showProvinces = (opts?: object) => mapInstance.value?.showProvinces(opts);
  const showWards = (code?: string) => mapInstance.value?.showWards(code);
  const setView = (lng: number, lat: number, zoom = 10) =>
    mapInstance.value?.setView([lng, lat], zoom);
  const fitBounds = (
    bounds: [[number, number], [number, number]],
  ) => mapInstance.value?.fitBounds(bounds);
  const reverseGeocode = (lng: number, lat: number) =>
    mapInstance.value?.reverseGeocode(lng, lat);

  return {
    containerRef,
    isReady,
    error,
    showProvinces,
    showWards,
    setView,
    fitBounds,
    reverseGeocode,
  };
}
```

**`components/VietnamMap.vue`**:

```vue
<template>
  <div>
    <div v-if="error" class="error">Lỗi: {{ error }}</div>
    <div v-if="!isReady" class="loading">Đang tải bản đồ...</div>
    <div ref="containerRef" class="map-container" />
  </div>
</template>

<script setup lang="ts">
import { useVNGisMap } from '../composables/useVNGisMap';

const props = defineProps<{
  apiBaseUrl: string;
  token?: string;
  initialLayers?: { provinces?: boolean };
}>();

const { containerRef, isReady, error, setView, showProvinces } = useVNGisMap({
  apiBaseUrl: props.apiBaseUrl,
  token: props.token,
  initialLayers: props.initialLayers,
});

function goToHanoi() {
  setView(105.85, 21.02, 12);
}
</script>

<style scoped>
.map-container {
  height: 500px;
  width: 100%;
}
.error { color: red; }
.loading { color: #666; }
</style>
```

#### 2. Form đăng nhập + Map

**`components/LoginForm.vue`**:

```vue
<template>
  <form @submit.prevent="handleLogin">
    <input
      v-model="email"
      type="email"
      placeholder="Email"
      required
    />
    <input
      v-model="password"
      type="password"
      placeholder="Mật khẩu"
      required
    />
    <p v-if="error" class="error">{{ error }}</p>
    <button type="submit" :disabled="loading">
      {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ApiClient } from '@vn-gis/map';

const emit = defineEmits<{
  (e: 'login', token: string): void;
}>();

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  error.value = '';

  const client = new ApiClient({ baseUrl: 'https://api.example.com' });

  try {
    const result = await client.login('https://api.example.com', email.value, password.value);
    emit('login', result.accessToken);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Đăng nhập thất bại';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.error { color: red; }
</style>
```

**`App.vue`**:

```vue
<template>
  <VietnamMap
    v-if="token"
    :api-base-url="apiBaseUrl"
    :token="token"
    :initial-layers="{ provinces: true }"
  />
  <LoginForm
    v-else
    @login="token = $event"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VietnamMap from './components/VietnamMap.vue';
import LoginForm from './components/LoginForm.vue';

const token = ref<string | null>(null);
const apiBaseUrl = 'https://api.example.com';
</script>
```

---

## Truy cập cấp thấp

```ts
// Renderer đang dùng
map.getRenderer();

// ApiClient — gọi API thủ công
const client = map.getApiClient();
const provinces = await client.getProvinces();

// LayerManager
map.getLayerManager();

// Map native (Leaflet.Map hoặc maplibregl.Map)
import { LeafletRenderer } from '@vn-gis/map/leaflet';
const native = (map.getRenderer() as LeafletRenderer).getNativeMap();
```

---

## Dọn dẹp

Luôn gọi `destroy()` khi component unmount để tránh memory leak:

```ts
useEffect(() => {
  const map = new VNGisMap(config, factory);
  return () => map.destroy();
}, []);
```

```vue
<script setup>
onUnmounted(() => map.value?.destroy());
</script>
```

---

## Constants & Helpers

```ts
import {
  VN_BOUNDS,          // Bounds toàn Việt Nam
  VN_CENTER_LNGLAT,   // [lng, lat] trung tâm VN
  VN_CENTER_LATLNG,   // [lat, lng] trung tâm VN
  VN_DEFAULT_ZOOM,    // Zoom mặc định
  VN_MAP_ZOOM,        // Zoom bản đồ
  VN_STYLE_PRESETS,   // Mảng preset style
  mergeStyle,         // Trộn style objects
  isFeature,
  isFeatureCollection,
} from '@vn-gis/map';
```

---

## Development

```bash
npm install
npm run typecheck   # kiểm tra kiểu
npm run lint        # lint
npm test            # chạy unit tests
npm run build       # build ESM/CJS/UMD + d.ts
```

Xem `examples/` cho ví dụ HTML chạy trực tiếp trên trình duyệt.

---

## License

[MIT](./LICENSE)
