# Chi tiết `src/utils/*` — Tiện ích nội bộ

`src/utils/` chứa 3 module độc lập: hằng số toạ độ (`bounds.ts`), cache TTL (`cache.ts`), và style defaults + helper (`style.ts`). Cả ba đều là pure code, dễ test, không phụ thuộc DOM.

---

## `bounds.ts` — Hằng số địa lý Việt Nam

**File**: `src/utils/bounds.ts` (~50 dòng).

### Mục đích

Cung cấp các hằng số quốc gia để hiển thị mặc định toàn bộ lãnh thổ Việt Nam mà không cần hard-code trong nhiều file.

### `VN_BOUNDS`

```ts
export const VN_BOUNDS = {
  north: 23.393395,    // vĩ độ cực Bắc (Hà Giang)
  south: 8.179199,     // vĩ độ cực Nam (Cà Mau)
  east: 109.469229,    // kinh độ cực Đông
  west: 102.144598,    // kinh độ cực Tây
  center: [106.0, 16.0],         // [lng, lat]
  asBounds: [                    // [[south, west], [north, east]]
    [8.179199, 102.144598],
    [23.393395, 109.469229],
  ],
} as const;
```

| Field | Sử dụng |
|---|---|
| `north/south/east/west` | Lat/lng lớn nhất / nhỏ nhất. |
| `center` | `[lng, lat]` — trung tâm địa lý Việt Nam. |
| `asBounds` | Tuple `[[south, west], [north, east]]` đã chuẩn hoá để truyền cho `fitBounds()`. |

### `VN_DEFAULT_ZOOM`

```ts
export const VN_DEFAULT_ZOOM = 6;
```

Zoom mặc định để hiển thị toàn bộ Việt Nam (thường từ 5 đến 7).

### `VN_CENTER_LATLNG` và `VN_CENTER_LNGLAT`

```ts
export const VN_CENTER_LATLNG: [number, number] = [16.0, 106.0];   // [lat, lng] — cho Leaflet
export const VN_CENTER_LNGLAT: LngLat          = [106.0, 16.0];    // [lng, lat] — cho MapLibre
```

> ⚠️ **Lưu ý thứ tự** — Leaflet dùng `[lat, lng]`, MapLibre/GeoJSON dùng `[lng, lat]`. Hai hằng số cùng giá trị nhưng thứ tự khác nhau để khỏi nhầm.

### `VN_MAP_ZOOM`

```ts
export const VN_MAP_ZOOM = {
  min: 4,             // zoom tối thiểu (xa nhất)
  max: 18,            // zoom tối đa (gần nhất)
  province: 8,        // zoom mặc định khi nhìn 1 tỉnh
  ward: 11,           // zoom mặc định khi nhìn 1 xã
} as const;
```

| Giá trị | Mục đích |
|---|---|
| `min` | Tránh pan ra quá xa khi setView. |
| `max` | Tránh zoom vào quá gần. |
| `province` | Zoom được `VNGisMap.setView()` mặc định. |
| `ward` | Gợi ý khi code khác muốn zoom cho ward. |

### Sử dụng

```ts
import { VN_BOUNDS, VN_CENTER_LNGLAT, VN_MAP_ZOOM } from '@vn-gis/map';

new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: 'https://api.example.com',
    token: 'xxx',
    initialView: { center: VN_CENTER_LNGLAT, zoom: VN_MAP_ZOOM.province },
    initialBounds: VN_BOUNDS.asBounds,
  },
  () => new LeafletRenderer(L),
);
```

---

## `cache.ts` — TTL cache đơn giản

**File**: `src/utils/cache.ts` (~60 dòng).

### Mục đích

Cung cấp cache in-memory kèm **TTL (time-to-live)**. Được `ApiClient` dùng để cache GeoJSON response — tránh gọi API lặp lại nhiều lần.

### Khai báo

```ts
interface CacheEntry<T> {
  value: T;
  expiresAt: number;       // epoch milliseconds
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private defaultTtlMs: number;
  
  constructor(defaultTtlSeconds = 600);  // 10 phút
  // ...
}
```

### Phương thức

| Method | Trả về | Mô tả |
|---|---|---|
| `set(key, value, ttlSeconds?)` | `void` | Lưu entry. Nếu `ttlSeconds` không truyền → dùng TTL mặc định của `Cache`. `expiresAt = Date.now() + ttl*1000`. |
| `get(key)` | `T \| undefined` | Lấy giá trị. **Tự xoá nếu hết hạn**. |
| `has(key)` | `boolean` | Tương đương `get(key) !== undefined` (cũng tự xoá expired). |
| `delete(key)` | `void` | Xoá entry. |
| `clear()` | `void` | Xoá toàn bộ. |
| `purgeExpired()` | `void` | Duyệt store, xoá mọi entry hết hạn. Được `size` getter gọi. |
| `size` (getter) | `number` | Số entry (đã purge). |

### Đặc điểm

- **In-memory only**: không dùng localStorage/sessionStorage.
- **Lazy expiry**: không có interval tự động purge. Chỉ purge khi:
  - `get` thấy entry hết hạn.
  - `has` được gọi.
  - `size` được đọc.
- **Không có `maxSize`**: cache có thể tăng vô hạn. Phù hợp vì GeoJSON response thường chỉ vài key.

### Constructor

```ts
new Cache<MyType>(600);     // TTL = 600 giây (10 phút)
new Cache<MyType>();        // TTL mặc định = 600 giây
```

### Ví dụ

```ts
const cache = new Cache<VNGeoJSONCollection>(300);  // 5 phút

cache.set('provinces', data);
cache.set('provinces:01', wardsData, 60);          // override TTL: 60s

if (cache.has('provinces')) {
  const data = cache.get('provinces');
}
```

### Sử dụng trong `ApiClient`

`ApiClient` tạo 1 instance `Cache<AnyResponse>` và dùng các key:

```ts
'gis:provinces'
'gis:wards:<provinceCode>'  hoặc  'gis:wards:all'
'gis:lookup:<lng>:<lat>'
'custom:<url>'
```

Khi `setToken` hoặc `clearCache` được gọi → `cache.clear()` để tránh nhầm response cũ thuộc user khác.

---

## `style.ts` — Style presets và helper merge

**File**: `src/utils/style.ts` (~95 dòng).

### Mục đích

- Cung cấp style **mặc định** cho 3 loại layer (provinces/wards/custom).
- Cung cấp **palette** màu (`VN_STYLE_PRESETS`) cho choropleth maps hoặc tuỳ chỉnh theme.
- Helper `mergeStyle()` để gộp style default với user override mà không mutate.

### Style mặc định

```ts
export const DEFAULT_PROVINCE_STYLE: LayerStyle = {
  fillColor: '#4a90d9',     // xanh dương nhạt
  fillOpacity: 0.2,
  strokeColor: '#2c6fad',
  strokeWidth: 1.5,
  hoverFillColor: '#4a90d9',
  hoverStrokeColor: '#1a4f8a',
};

export const DEFAULT_WARD_STYLE: LayerStyle = {
  fillColor: '#52c41a',     // xanh lá
  fillOpacity: 0.2,
  strokeColor: '#389e0d',
  strokeWidth: 1,
  hoverFillColor: '#52c41a',
  hoverStrokeColor: '#237804',
};

export const DEFAULT_CUSTOM_STYLE: LayerStyle = {
  fillColor: '#eb5757',     // đỏ
  fillOpacity: 0.25,
  strokeColor: '#c0392b',
  strokeWidth: 1.5,
  hoverFillColor: '#eb5757',
  hoverStrokeColor: '#96281b',
};
```

| Constant | Dùng cho |
|---|---|
| `DEFAULT_PROVINCE_STYLE` | Provinces layer |
| `DEFAULT_WARD_STYLE` | Wards layer |
| `DEFAULT_CUSTOM_STYLE` | Custom GeoJSON layer |

`VNGisMap.showProvinces`/`showWards`/`addCustomLayer` tự động merge: `mergeStyle(DEFAULT_*, options.style)`.

### `VN_STYLE_PRESETS` — palette sẵn

```ts
export const VN_STYLE_PRESETS = {
  default:  DEFAULT_PROVINCE_STYLE,
  blue:     { fillColor: '#4a90d9', ... },
  green:    { fillColor: '#52c41a', ... },
  red:      { fillColor: '#eb5757', ... },
  orange:   { fillColor: '#fa8c16', ... },
  purple:   { fillColor: '#722ed1', ... },
} as const;
```

> Tất cả preset dùng `satisfies LayerStyle` → giữ chặt chẽ type.

### Cách dùng presets

```ts
import { VN_STYLE_PRESETS, VNGisMap } from '@vn-gis/map';

await map.showProvinces({ style: VN_STYLE_PRESETS.green });
```

### `mergeStyle(defaults, overrides?)`

```ts
export function mergeStyle(
  defaults: LayerStyle,
  overrides?: LayerStyle,
): LayerStyle {
  if (!overrides) return { ...defaults };
  return { ...defaults, ...overrides };
}
```

- **Không mutate** `defaults` (luôn trả object mới).
- `overrides` thắng — key nào trong `overrides` sẽ thay thế key tương ứng trong `defaults`.

```ts
mergeStyle(DEFAULT_WARD_STYLE, { fillColor: '#ff0000' });
// {
//   fillColor: '#ff0000',            // override
//   fillOpacity: 0.2,               // từ default
//   strokeColor: '#389e0d',
//   strokeWidth: 1,
//   hoverFillColor: '#52c41a',
//   hoverStrokeColor: '#237804',
// }
```

### Tại sao cần `mergeStyle`?

Vì `LayerStyle` có nhiều trường (fillColor, fillOpacity, hoverFillColor, …). Nếu user chỉ cung cấp một phần, ta phải:

- Giữ các field mặc định.
- Áp dụng phần override.
- Không làm hỏng object mặc định (nếu không, lần gọi sau sẽ dùng giá trị đã merge!).

`mergeStyle` đảm bảo cả 3 điều trên.

### Ví dụ nâng cao — theme theo feature

```ts
import { VN_STYLE_PRESETS } from '@vn-gis/map';

await map.showProvinces({
  styleFunction: (feature) => {
    const density = Number(feature.properties?.population ?? 0);
    if (density > 5_000_000) return VN_STYLE_PRESETS.red;
    if (density > 1_000_000) return VN_STYLE_PRESETS.orange;
    return VN_STYLE_PRESETS.green;
  },
});
```

---

## Sub-export: `src/utils/index.ts`

```ts
export {
  VN_BOUNDS,
  VN_DEFAULT_ZOOM,
  VN_CENTER_LATLNG,
  VN_CENTER_LNGLAT,
  VN_MAP_ZOOM,
} from './bounds';
export { Cache } from './cache';
export {
  DEFAULT_PROVINCE_STYLE,
  DEFAULT_WARD_STYLE,
  DEFAULT_CUSTOM_STYLE,
  VN_STYLE_PRESETS,
  mergeStyle,
} from './style';
```

Tất cả được re-export qua `src/index.ts`, người dùng có thể:

```ts
import {
  VN_BOUNDS,
  VN_CENTER_LNGLAT,
  Cache,                  // ít khi cần — chủ yếu ApiClient dùng nội bộ
  mergeStyle,
  DEFAULT_PROVINCE_STYLE,
  VN_STYLE_PRESETS,
} from '@vn-gis/map';
```

---

## Tổng kết

| File | Xuất ra | Mục đích chính |
|---|---|---|
| `bounds.ts` | `VN_BOUNDS`, `VN_DEFAULT_ZOOM`, `VN_CENTER_*`, `VN_MAP_ZOOM` | Toạ độ Việt Nam, zoom mặc định. |
| `cache.ts` | `Cache<T>` class | TTL cache in-memory cho ApiClient. |
| `style.ts` | `DEFAULT_*_STYLE`, `VN_STYLE_PRESETS`, `mergeStyle` | Style mặc định + helper gộp không đột biến. |
