# Chi tiết `src/types/*` — Hệ thống kiểu

Các file trong `src/types/` định nghĩa toàn bộ public type của package. TypeScript declaration files (`.d.ts`) được sinh tự động trong build và công khai cho người dùng thư viện.

---

## File tổng hợp: `src/types/index.ts`

```ts
export type { ... } from './api.types';
export type { ... } from './config.types';
export { isFeatureCollection, isFeature } from './geojson.types';
```

Tất cả type mà người dùng có thể import đều đi qua file này.

---

## `api.types.ts` — Type cho API & GeoJSON response

**File**: `src/types/api.types.ts` (~100 dòng).

### `VNGeoJSONFeatureProperties`

```ts
export interface VNGeoJSONFeatureProperties {
  code: string;
  name: string;
  nameEn?: string;
  fullName?: string;
  full_name?: string;       // alias snake_case đề phòng API trả về dạng này
  fullNameEn?: string;
  codeName?: string;
  provinceCode?: string;    // có trên ward features
  province_code?: string;   // alias
  area_km2?: number | string | null;
  [key: string]: unknown;   // cho phép field tuỳ ý khác từ API
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `code` | ✅ | Mã hành chính (vd `'01'` = Hà Nội). |
| `name` | ✅ | Tên ngắn (vd `'Hà Nội'`). |
| `nameEn` | ❌ | Tên tiếng Anh. |
| `fullName` | ❌ | Tên đầy đủ (vd `'Thành phố Hà Nội'`). |
| `full_name` | ❌ | Snake_case fallback nếu API không camelCase. |
| `fullNameEn` | ❌ | Tên đầy đủ tiếng Anh. |
| `codeName` | ❌ | Tên theo mã (không phổ biến). |
| `provinceCode` / `province_code` | ❌ | Mã tỉnh (chỉ có ở ward). |
| `area_km2` | ❌ | Diện tích km² — kiểu linh hoạt vì API có thể trả `number`, `string`, hoặc `null`. |
| `[key: string]` | ❌ | Cho phép các trường tùy ý. |

### `VNGeoJSONFeature`

```ts
export type VNGeoJSONFeature = Feature<Geometry, VNGeoJSONFeatureProperties>;
```

Kết hợp chuẩn GeoJSON `Feature` (định nghĩa trong package `@types/geojson`) với `VNGeoJSONFeatureProperties`.

### `VNGeoJSONCollection`

```ts
export type VNGeoJSONCollection = FeatureCollection<Geometry, VNGeoJSONFeatureProperties>;
```

Đây là kiểu dữ liệu GeoJSON mọi endpoint `/v1/gis/*` trả về.

### `LookupResult`

```ts
export interface LookupResult {
  found: boolean;
  point: { lng: number; lat: number };
  ward?: {
    ward_code: string;
    ward_name: string;
    ward_full_name: string;
    province_code: string;
    province_name: string;
    province_full_name: string;
    area_km2: string | null;
  };
}
```

Kết quả của `reverseGeocode(lng, lat)`.

| Field | Mô tả |
|---|---|
| `found` | `true` nếu tìm thấy ward chứa toạ độ. |
| `point` | Toạ độ đã truy vấn (echo). |
| `ward` | Thông tin ward + province. `undefined` nếu `found = false`. |
| `ward_full_name` | Ví dụ: `'Xã Thạch Đà, Huyện Thanh Trì, Thành phố Hà Nội'`. |
| `province_full_name` | Ví dụ: `'Thành phố Hà Nội'`. |

### `ApiEnvelope<T>`

```ts
export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

Định dạng NestJS TransformInterceptor trả về. `ApiClient` dùng interface này khi `responseFormat: 'envelope'`.

### `ApiError`

```ts
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];   // NestJS hay trả mảng
  path: string;
  timestamp: string;
  correlationId: string;
}
```

Định dạng `HttpExceptionFilter` của vn-gis-api.

### `AuthUser`

```ts
export interface AuthUser {
  id: number;
  email: string;
  role: string;     // 'ADMIN' | 'USER' | ...
}
```

### `ValidateResult`

```ts
export interface ValidateResult {
  valid: boolean;
  user?: AuthUser;       // chỉ có khi valid = true
  reason?: string;       // chỉ có khi valid = false
}
```

### `LoginResult`

```ts
export interface LoginResult {
  accessToken: string;
  expiresIn: string;     // ví dụ '7d'
  user: AuthUser;
}
```

---

## `config.types.ts` — Type cho cấu hình & runtime

**File**: `src/types/config.types.ts` (~165 dòng).

### `LngLat`

```ts
export type LngLat = [number, number];
```

Toạ độ theo thứ tự `[longitude, latitude]`. **Khác với Leaflet** (lat-lng).

### `Bounds`

```ts
export type Bounds = [[number, number], [number, number]];
```

Dạng `[[south, west], [north, east]]`. Cũng có thể gọi là SW/NE.

### `LayerStyle`

```ts
export interface LayerStyle {
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  hoverFillColor?: string;     // CSS color cho hover state
  hoverStrokeColor?: string;
}
```

| Field | Mô tả |
|---|---|
| `fillColor` | Màu nền polygon (CSS color, vd `'#4a90d9'`). |
| `fillOpacity` | Độ trong suốt (0-1). |
| `strokeColor` | Màu viền polygon. |
| `strokeWidth` | Độ dày viền (px). |
| `hoverFillColor` | Màu nền khi hover (Leaflet/MapLibre tự dùng). |
| `hoverStrokeColor` | Màu viền khi hover. |

### `LayerOptions`

```ts
export interface LayerOptions {
  style?: LayerStyle;
  styleFunction?: StyleFunction;
  interactive?: boolean;          // default true
  zIndex?: number;
  popup?: boolean | PopupOptions;
  tooltip?: boolean | string;
}
```

| Field | Mô tả |
|---|---|
| `style` | Style tĩnh cho toàn bộ layer. |
| `styleFunction` | Hàm trả về style động dựa trên feature (choropleth maps). |
| `interactive` | `false` = tắt click/hover/popup/tooltip. |
| `zIndex` | Thứ tự layer (cao = trên cùng). |
| `popup` | `true` = popup mặc định, hoặc cấu hình chi tiết. |
| `tooltip` | `true` = lấy name làm tooltip, hoặc cung cấp string. |

### `StyleFunction`

```ts
export type StyleFunction = (feature: VNGeoJSONFeature) => LayerStyle | undefined;
```

Dùng để style theo feature:

```ts
await map.showProvinces({
  styleFunction: (f) => {
    const area = Number(f.properties?.area_km2 ?? 0);
    return area > 10000
      ? { fillColor: '#c0392b' }
      : { fillColor: '#4a90d9' };
  },
});
```

### `PopupOptions`

```ts
export interface PopupOptions {
  contentTemplate?: (feature) => string;  // HTML tuỳ ý
  className?: string;
}
```

### `VNMapConfig` — cấu hình chính

```ts
export interface VNMapConfig {
  container: string | HTMLElement;
  renderer: 'leaflet' | 'maplibre';
  apiBaseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  initialView?: { center: LngLat; zoom: number };
  initialBounds?: Bounds;
  layers?: InitialLayers;
  tileUrl?: string;
  attribution?: string;
  onProvinceClick?: (feature) => void;
  onWardClick?: (feature) => void;
  onCustomLayerClick?: (feature, layerId) => void;
  cacheTtl?: number;       // giây
}
```

| Field | Bắt buộc | Mô tả |
|---|---|---|
| `container` | ✅ | CSS selector hoặc `HTMLElement`. |
| `renderer` | ✅ | `'leaflet'` hoặc `'maplibre'`. |
| `apiBaseUrl` | ✅ | Base URL vn-gis-api. |
| `token` | nếu không có user/pass | Bearer JWT. |
| `username` | nếu không có token | Email để auto-login. |
| `password` | nếu dùng username | Mật khẩu. |
| `initialView` | ❌ | Nếu không truyền → dùng trung tâm VN, zoom 6. |
| `initialBounds` | ❌ | Nếu có, sẽ gọi `fitBounds` ngay khi ready. |
| `layers` | ❌ | Initial layers tự động load. |
| `tileUrl` | ❌ | URL template cho tile. Mặc định Carto basemap. |
| `attribution` | ❌ | Attribution text. |
| `onProvinceClick` | ❌ | Callback khi click tỉnh. |
| `onWardClick` | ❌ | Callback khi click xã/phường. |
| `onCustomLayerClick` | ❌ | Callback khi click custom layer (nhận `layerId`). |
| `cacheTtl` | ❌ | TTL cache API (giây). Mặc định `600`. |

### `InitialLayers`

```ts
export interface InitialLayers {
  provinces?: boolean | LayerOptions;        // true = load với style mặc định
  wards?: { provinceCode: string; options?: LayerOptions }[];
  custom?: { source: string; options?: LayerOptions }[];
}
```

`provinces: true` tương đương `provinces: {}`.

### `CustomLayerSource`

```ts
export type CustomLayerSource = string | VNGeoJSONCollection;
```

Nguồn custom layer: URL string hoặc object inline.

### `RegisteredLayer`

```ts
export interface RegisteredLayer {
  id: string;
  type: 'provinces' | 'wards' | 'custom';
  nativeLayer: unknown;       // tham chiếu internal
  options: LayerOptions;
  meta?: { provinceCode?: string; source?: string };
  style: LayerStyle;
  visible: boolean;
}
```

### `MapEvent`

```ts
export type MapEvent =
  | 'ready' | 'click' | 'mousemove'
  | 'zoomstart' | 'zoomend'
  | 'movestart' | 'moveend'
  | 'load' | 'error';
```

### `MapEventPayload<T>`

```ts
export interface MapEventPayload<T = unknown> {
  type: MapEvent;
  target: unknown;
  lngLat?: LngLat;
  feature?: VNGeoJSONFeature;
  layerId?: string;
  error?: Error;
  data?: T;
}
```

### `EventHandler<T>`

```ts
export type EventHandler<T = unknown> = (payload: MapEventPayload<T>) => void;
```

---

## `geojson.types.ts` — Standard GeoJSON & type guards

**File**: `src/types/geojson.types.ts` (~40 dòng).

### Re-export chuẩn GeoJSON

```ts
export type {
  Feature, FeatureCollection,
  Geometry, GeometryCollection,
  Point, MultiPoint,
  LineString, MultiLineString,
  Polygon, MultiPolygon,
  GeoJsonProperties, BBox, Position,
} from 'geojson';
```

> Tất cả đến từ package `@types/geojson` (npm). Bằng cách re-export từ package, người dùng có thể `import { Feature } from '@vn-gis/map'` thay vì cài thêm `@types/geojson`.

### Type guard `isFeatureCollection`

```ts
export function isFeatureCollection(obj: unknown): obj is GeoJSON.FeatureCollection {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>)['type'] === 'FeatureCollection'
  );
}
```

Dùng để kiểm tra runtime:

```ts
import { isFeatureCollection } from '@vn-gis/map';
const data: unknown = await fetch('...');
if (isFeatureCollection(data)) {
  // data giờ được thu hẹp kiểu → FeatureCollection
  console.log(data.features.length);
}
```

### Type guard `isFeature`

```ts
export function isFeature(obj: unknown): obj is GeoJSON.Feature {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as Record<string, unknown>)['type'] === 'Feature'
  );
}
```

---

## Tổng hợp: Type nào dùng ở đâu?

| Tình huống | Type liên quan |
|---|---|
| Khởi tạo `VNGisMap` | `VNMapConfig`, `InitialLayers`, `LngLat`, `Bounds`, `LayerOptions` |
| Đọc kết quả API | `VNGeoJSONCollection`, `VNGeoJSONFeature`, `LookupResult`, `ApiEnvelope`, `ValidateResult`, `LoginResult`, `AuthUser` |
| Cấu hình style | `LayerStyle`, `LayerOptions`, `PopupOptions`, `StyleFunction` |
| Event handling | `MapEvent`, `MapEventPayload`, `EventHandler` |
| Quản lý layer | `RegisteredLayer`, `CustomLayerSource` |
| Validation runtime | `isFeature`, `isFeatureCollection` |
| Custom types | `ApiClientConfig`, `MapInitOptions`, `IRenderer` (xem [`RENDERERS.md`](./RENDERERS.md)) |
| Utils | `Cache<T>` (xem [`UTILS.md`](./UTILS.md)) |

---

## Mẹo viết type-safe code

### 1. Hẹn kiểu feature properties

```ts
import type { VNGeoJSONFeature, VNGeoJSONFeatureProperties } from '@vn-gis/map';

map.onProvinceClick((feature: VNGeoJSONFeature) => {
  const props: VNGeoJSONFeatureProperties = feature.properties!;
  console.log(props.code, props.name, props.area_km2);
});
```

### 2. Dùng type guard trước khi truy cập

```ts
import { isFeatureCollection } from '@vn-gis/map';

async function loadUrl(url: string) {
  const res = await fetch(url);
  const data = (await res.json()) as unknown;
  if (!isFeatureCollection(data)) {
    throw new Error('Not a FeatureCollection');
  }
  return data; // an toàn: kiểu FeatureCollection
}
```

### 3. Kiểu strict cho callback

```ts
map.on('ready', (payload) => {
  // payload: MapEventPayload<unknown>
  // payload.type === 'ready'
});
```

### 4. `CustomLayerSource` cho input linh hoạt

```ts
function addLayer(source: string | VNGeoJSONCollection) { /* ... */ }
addLayer('https://cdn.example.com/data.geojson');
addLayer({ type: 'FeatureCollection', features: [...] });
```
