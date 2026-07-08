# Chi tiết `src/core/*` — Lõi của thư viện

Bốn class quan trọng nhất của package nằm trong `src/core/`. Chúng phối hợp chặt chẽ với nhau để cung cấp API public duy nhất là class `VNGisMap`.

---

## `VNGisMap` — facade chính

**File**: `src/core/VNGisMap.ts` (400 dòng).

### Mục đích

`VNGisMap` là **điểm vào duy nhất** mà người dùng tương tác. Nó ẩn đi sự phức tạp của:

- Khởi tạo renderer (Leaflet/MapLibre).
- Quản lý layer (thêm/xoá, show/hide, đổi style).
- Gọi API `vn-gis-api` để lấy GeoJSON.
- Forward sự kiện từ renderer nội bộ ra event emitter ngoài.
- Cleanup resources khi component unmount.

### Khai báo

```ts
export type RendererFactory = (config: VNMapConfig) => IRenderer;

export class VNGisMap {
  // ...
}
```

| Thành viên | Kiểu | Mô tả |
|---|---|---|
| `config` | `VNMapConfig` | Cấu hình đã truyền vào (private) |
| `renderer` | `IRenderer` | Renderer instance sau khi gọi factory |
| `api` | `ApiClient` | HTTP client gắn với map này |
| `layerManager` | `LayerManager` | Quản lý layer gắn với map này |
| `emitter` | `EventEmitter` | Bộ phát sự kiện nội bộ |
| `ready` | `boolean` | Trạng thái: `true` khi renderer đã fire `'ready'` |

### Constructor

```ts
constructor(config: VNMapConfig, rendererFactory: RendererFactory)
```

**Tham số**:

| Tên | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `config` | `VNMapConfig` | ✅ | Bao gồm `container`, `renderer`, `apiBaseUrl`, `token`/`username`+`password`, `initialView`/`initialBounds`, `layers`, callbacks, ... |
| `rendererFactory` | `(cfg) => IRenderer` | ✅ | Factory tạo renderer. Bắt buộc vì renderer là peer dependency. |

**Công việc constructor**:

1. Lưu `config`.
2. Gọi `rendererFactory(config)` → lấy renderer instance.
3. Khởi tạo `ApiClient` với `baseUrl`, `token`, `username`, `password`, `cacheTtl` từ config.
4. Khởi tạo `LayerManager(renderer)`.
5. Gọi `init()` để khởi tạo renderer.

**Ném lỗi**:

- Nếu container selector không trỏ tới element nào trong DOM.

### Getter

| Getter | Trả về | Mục đích |
|---|---|---|
| `isReady` | `boolean` | `true` sau khi renderer emit `'ready'` (bản đồ đã hiển thị lần đầu). |

### Phương thức public — Layers

| Phương thức | Trả về | Mô tả |
|---|---|---|
| `showProvinces(options?: LayerOptions)` | `Promise<string>` | Lấy GeoJSON tỉnh/thành, gộp style mặc định với `options.style`, gọi `LayerManager.add(...)`. Trả về layer id (`'vn-provinces'`). |
| `hideProvinces()` | `void` | Xoá layer tỉnh. |
| `showWards(provinceCode, options?)` | `Promise<string>` | Lấy GeoJSON xã/phường của 1 tỉnh. Layer id = `vn-wards-<code>`. |
| `hideWards(provinceCode)` | `void` | Xoá layer xã/phường của 1 tỉnh. |
| `addCustomLayer(source, options?, layerId?)` | `Promise<string>` | Thêm layer từ URL hoặc inline `VNGeoJSONCollection`. Tự sinh id `vn-custom-<timestamp>` nếu không truyền. |
| `removeLayer(layerId)` | `boolean` | Xoá layer bất kỳ. |
| `setLayerStyle(layerId, style)` | `boolean` | Cập nhật style một layer. |
| `setLayerVisibility(layerId, visible)` | `boolean` | Ẩn/hiện layer. |
| `toggleLayer(layerId)` | `boolean` | Đảo trạng thái hiển thị. |

### Phương thức public — Geocoding & điều hướng

| Phương thức | Trả về | Mô tả |
|---|---|---|
| `reverseGeocode(lng, lat)` | `Promise<LookupResult>` | Truy vấn API. Có cache. |
| `setView(center: LngLat, zoom?)` | `void` | Di chuyển bản đồ. Zoom mặc định = `VN_MAP_ZOOM.province` = 8. |
| `fitBounds(bounds)` | `void` | Zoom để vừa khung bounds. |

### Phương thức public — Sự kiện

| Phương thức | Mô tả |
|---|---|
| `on(event, handler)` | Đăng ký listener. Event: `'ready'`, `'click'`, `'mousemove'`, `'zoomstart'/'zoomend'`, `'movestart'/'moveend'`, `'load'`, `'error'`. |
| `off(event, handler)` | Hủy listener. |
| `once(event, handler)` | Listener chạy đúng 1 lần. |

### Phương thức public — Lifecycle

```ts
destroy(): void
```

- Xoá mọi layer (`layerManager.clear()`).
- Hủy map gốc (`renderer.destroy()`).
- Remove mọi event listener (`emitter.removeAllListeners()`).
- Xoá cache (`api.clearCache()`).
- Đặt `ready = false`.

> ⚠️ **Best practice**: Khi dùng trong framework (React, Vue…), luôn gọi `destroy()` trong cleanup function.

### Phương thức public — Truy cập nội bộ

| Phương thức | Trả về | Mục đích |
|---|---|---|
| `getRenderer()` | `IRenderer` | Trường hợp cần renderer cụ thể (cast sang Leaflet/MapLibre renderer để gọi `getNativeMap()`). |
| `getApiClient()` | `ApiClient` | Gọi API thủ công ngoài scope của VNGisMap. |
| `getLayerManager()` | `LayerManager` | Truy cập registry layer. |

### Private helpers

| Hàm | Mục đích |
|---|---|
| `init()` | Khởi tạo renderer: gọi `renderer.initialize()`, đăng ký forward sự kiện, chờ event `'ready'` rồi load initialLayers. |
| `forwardRendererEvents()` | Re-emit 8 events của renderer (`click`, `mousemove`, `zoom*`, `move*`, `load`, `error`) qua `emitter`. |
| `loadInitialLayers(layers)` | Gọi `showProvinces/showWards/addCustomLayer` cho từng item trong config.layers. Lỗi sẽ emit event `'error'`. |
| `wireLayerClick(layerId, handler)` | Uỷ quyền click cho renderer. |
| `resolveContainer(container)` | Nếu là `string` → `document.getElementById` hoặc `document.querySelector`. Throw nếu không tìm thấy. |

### Ví dụ sử dụng đầy đủ

```ts
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import * as L from 'leaflet';

const map = new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: 'https://api.example.com',
    token: 'JWT',
    initialView: { center: [105.85, 21.02], zoom: 10 },
    layers: {
      provinces: { style: { fillColor: '#4a90d9', fillOpacity: 0.3 } },
      wards: [{ provinceCode: '01' }, { provinceCode: '79' }],
    },
    onProvinceClick: (f) => console.log(f.properties?.name),
    cacheTtl: 300,
  },
  () => new LeafletRenderer(L),
);

map.on('ready', () => console.log('Sẵn sàng!'));

// Sau đó có thể thao tác thêm
await map.addCustomLayer('https://cdn.example.com/rivers.geojson');
map.setView([106.7, 10.78], 12); // TP.HCM
```

---

## `ApiClient` — HTTP client cho `vn-gis-api`

**File**: `src/core/ApiClient.ts` (~390 dòng).

### Mục đích

Quản lý tất cả request HTTP đến `vn-gis-api`:

- Authentication (Bearer token / auto-login bằng username/password).
- Cache kết quả GeoJSON theo TTL.
- Hỗ trợ nhiều format response (raw / envelope / auto-detect).
- Parse lỗi và trả về `ApiClientError`.

### Khai báo

```ts
export interface ApiClientConfig {
  baseUrl: string;
  token?: string;
  username?: string;
  password?: string;
  cacheTtl?: number;          // mặc định 600s
  responseFormat?: ResponseFormat; // 'raw' | 'envelope' | 'auto'
}

export type ResponseFormat = 'raw' | 'envelope' | 'auto';

export class ApiClientError extends Error {
  statusCode: number;
  detail?: unknown;
}

export class ApiClient {
  // ...
}
```

### Thuộc tính private

| Thuộc tính | Mục đích |
|---|---|
| `baseUrl` | Base URL, đã strip dấu `/` cuối |
| `token` | JWT hiện tại (rỗng nếu chưa login) |
| `cache` | `Cache<AnyResponse>` với TTL mặc định |
| `cacheTtl` | TTL mặc định (giây) |
| `responseFormat` | Chế độ parse |
| `_username`, `_password` | Dùng cho auto-login |

### Phương thức public — Endpoints GeoJSON

| Phương thức | Endpoint | Cache key | Ghi chú |
|---|---|---|---|
| `getProvinces()` | `GET /v1/gis/provinces` | `gis:provinces` | Toàn bộ tỉnh/thành. |
| `getWards(provinceCode?)` | `GET /v1/gis/wards?provinceCode=<code>` | `gis:wards:<code>` hoặc `gis:wards:all` | Lọc theo tỉnh nếu truyền. |
| `reverseGeocode(lng, lat)` | `GET /v1/gis/lookup?lng=<lng>&lat=<lat>` | `gis:lookup:<lng>:<lat>` | Trả về `LookupResult`. |
| `fetchGeoJSON(url)` | Bất kỳ URL nào trả GeoJSON | `custom:<url>` | **Không auth**. Validate `FeatureCollection`. |

### Phương thức public — Auth

| Phương thức | Mô tả |
|---|---|
| `login(baseUrlOverride?, usernameOverride?, passwordOverride?)` | `POST /v1/auth/login`. Trả về `LoginResult { accessToken, expiresIn, user }`. Throw `ApiClientError` nếu lỗi. |
| `validate(baseUrlOverride?, tokenOverride?)` | `GET /v1/auth/me`. Trả về `ValidateResult { valid: boolean, user?, reason? }`. **Không throw** — luôn trả về object. |
| `setToken(token)` | Đặt token thủ công (vd: sau refresh) + clear cache. |
| `clearCache()` | Xoá toàn bộ cache. |

### Private helpers

| Hàm | Mục đích |
|---|---|
| `ensureToken()` | Nếu chưa có token mà có username/password → gọi `login()` để lấy token. |
| `buildUrl(path, params)` | Dựng URL đầy đủ qua `URL` API (tự escape query). |
| `request<T>(path, params)` | Thực hiện fetch với Bearer header, unwrap theo `responseFormat`, throw `ApiClientError` nếu !ok. |
| `unwrap(body, format)` | Theo `format`: `'raw'` trả nguyên, `'envelope'` lấy `.data`, `'auto'` tự đoán GeoJSON/Lookup/envelope. |
| `extractUser(body)` | Parse `{ id, email, role }` từ body auth. |
| `extractLoginResult(body)` | Trích xuất `{ accessToken, expiresIn, user }`. |
| `looksLikeGeoJSON(value)` | Type-guard: `type === 'FeatureCollection'` + `features` là array. |
| `looksLikeLookup(value)` | Type-guard: `found: boolean`, `point: object`. |
| `isFeatureCollection(value)` | Alias cho `looksLikeGeoJSON`, dùng cho `fetchGeoJSON`. |

### Format response

`responseFormat` ảnh hưởng cách `request()` xử lý body:

- **`raw`**: trả về nguyên body. Dùng khi API trả GeoJSON trực tiếp.
- **`envelope`**: lấy `body.data`. Dùng khi API dùng NestJS TransformInterceptor.
- **`auto`**: 
  - Nếu body trông giống `FeatureCollection` → trả nguyên.
  - Nếu body trông giống `LookupResult` → trả nguyên.
  - Ngược lại nếu có field `data` → trả về `body.data`.

### Tham khảo nhanh — luồng `getProvinces()` không có token

```
getProvinces()
  ├── ensureToken()
  │     └── login(baseUrl, _username, _password)
  │           ├── POST /v1/auth/login
  │           └── this.token = result.accessToken
  ├── cache.get('gis:provinces')
  │     └── HIT → return cached
  ├── HTTP GET /v1/gis/provinces (Bearer ...)
  ├── unwrap(body, responseFormat)
  └── cache.set('gis:provinces', data)
```

### Tham khảo nhanh — luồng `validate()`

```
validate(baseUrlOverride?, tokenOverride?)
  ├── Nếu token rỗng → trả về valid:false, reason:"Chưa có token..."
  ├── GET <baseUrl>/v1/auth/me (Bearer ...)
  ├── ok (200):
  │     └── extractUser(body) → valid:true, user
  ├── 401:
  │     └── valid:false, reason:"Token không hợp lệ hoặc đã hết hạn..."
  ├── other non-ok:
  │     └── parse body.message → valid:false, reason
  └── network error:
        └── valid:false, reason:"Không thể kết nối đến <baseUrl>..."
```

### Lỗi `ApiClientError`

```ts
class ApiClientError extends Error {
  statusCode: number;     // HTTP status, hoặc 0 nếu lỗi parse
  message: string;        // đã được join từ mảng message (NestJS style)
  detail?: unknown;       // payload gốc của request gây lỗi
}
```

### Ví dụ sử dụng

```ts
import { ApiClient } from '@vn-gis/map';

// Standalone — không qua VNGisMap
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  username: 'admin@vn.gov.vn',
  password: 'mypassword',
});

const provinces = await client.getProvinces();
console.log(provinces.features.length);

// Kiểm tra credentials
const check = await client.validate();
if (!check.valid) console.error(check.reason);

// Login thủ công
const login = await client.login();
console.log(login.accessToken, login.user);
```

---

## `EventEmitter` — Pub/sub typed

**File**: `src/core/EventEmitter.ts` (~50 dòng).

### Mục đích

Một bộ phát sự kiện (event emitter) đơn giản nhưng type-safe. Được `VNGisMap` dùng để:

- Forward sự kiện từ `renderer` ra ngoài theo API thống nhất.
- Cách ly lỗi: nếu handler nào throw, các handler khác vẫn chạy.

### Khai báo

```ts
type EventHandler<T = unknown> = (payload: MapEventPayload<T>) => void;

export class EventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();
  // ...
}
```

### Phương thức

| Phương thức | Trả về | Mô tả |
|---|---|---|
| `on(event, handler)` | `this` | Đăng ký listener. Cho phép nhiều listener trên 1 event. |
| `off(event, handler)` | `this` | Hủy listener. |
| `once(event, handler)` | `this` | Listener chạy 1 lần rồi tự gỡ. Thực hiện bằng wrapper. |
| `emit(event, payload)` | `void` | Phát sự kiện. Payload `Omit<MapEventPayload, 'type'>` — emitter tự thêm `type: <event>`. |
| `removeAllListeners(event?)` | `void` | Nếu có `event` chỉ xoá listeners của event đó. Ngược lại xoá hết. |

### Đặc điểm

- **Internal**: gọi `'ready'` không có handler → không lỗi (Set rỗng).
- **Error isolation**: handler nào throw → được log qua `console.error('[VNGisMap] Error in event handler for "click":', err)`. Các handler sau vẫn chạy.

### Không có ở đây (so với Node's EventEmitter)

- Không có `prependListener`, `rawListeners`, `listenerCount`, `eventNames`.
- API cố ý tối giản để giảm surface area.

### Ví dụ

```ts
const e = new EventEmitter();
e.on('click', (p) => console.log(p.lngLat));
e.emit('click', { target: null, lngLat: [106, 16] });
// log: [106, 16]
```

---

## `LayerManager` — Registry layer

**File**: `src/core/LayerManager.ts` (~140 dòng).

### Mục đích

Quản lý vòng đời của tất cả layer GeoJSON đã thêm vào map. Cung cấp API đồng nhất, ẩn chi tiết của Leaflet/MapLibre bên dưới.

### Khai báo

```ts
type LayerType = 'provinces' | 'wards' | 'custom';

interface RegisteredLayer {
  id: string;              // id registry
  type: LayerType;
  nativeLayer: unknown;    // tham chiếu native layer (Leaflet L.GeoJSON hoặc MapLibre source/layer ids)
  options: LayerOptions;
  meta?: { provinceCode?: string; source?: string };
  style: LayerStyle;
  visible: boolean;
}

export class LayerManager {
  private registry = new Map<string, RegisteredLayer>();
  // ...
}
```

### Phương thức

| Phương thức | Trả về | Mô tả |
|---|---|---|
| `add(id, type, geojson, options?, meta?)` | `RegisteredLayer` | Nếu id đã tồn tại → remove trước (idempotent). Gọi `renderer.addGeoJSON(...)` để render thật, lưu vào registry. |
| `remove(id)` | `boolean` | Xoá khỏi registry + gọi `renderer.removeLayer(id)`. `false` nếu không tồn tại. |
| `clear(type?)` | `void` | Nếu có `type` → chỉ xoá layer đó. Ngược lại xoá hết. |
| `setStyle(id, style)` | `boolean` | Merge style vào `entry.style` rồi uỷ quyền `renderer.setLayerStyle(...)`. |
| `setVisibility(id, visible)` | `boolean` | Cập nhật `entry.visible` + uỷ quyền `renderer.setLayerVisibility(...)`. |
| `toggle(id)` | `boolean` | `setVisibility(id, !entry.visible)`. |
| `get(id)` | `RegisteredLayer \| undefined` | Lấy metadata 1 layer. |
| `has(id)` | `boolean` | Kiểm tra tồn tại. |
| `list(type?)` | `RegisteredLayer[]` | Danh sách tất cả (hoặc theo type). |
| `size` | `number` | Số layer đang quản lý. |

### Idempotency của `add()`

Khi gọi `add(id)` với id đã tồn tại, layer cũ được `remove()` trước rồi mới thêm mới. Điều này rất hữu ích khi:

- User click "Reload" để tải lại GeoJSON.
- Style thay đổi cần reset.

### Meta

Trường `meta` mang thông tin phụ:

- Ward layer: `meta.provinceCode = '01'`.
- Custom layer: `meta.source = 'https://cdn.example.com/rivers.geojson'` (khi thêm từ URL).

### Trách nhiệm tách biệt

`LayerManager`:

- ✅ Biết về `RegisteredLayer`, registry, options, style merge, visibility toggle.
- ❌ KHÔNG biết về Leaflet L.GeoJSON hay MapLibre source/layer — chỉ thông qua `IRenderer`.

### Ví dụ

```ts
const lm = new LayerManager(renderer);
const id = lm.add('vn-provinces', 'provinces', geojson, { style: { fillColor: '#4a90d9' } });
lm.setStyle(id, { fillColor: '#ff0000' });
lm.setVisibility(id, false);
lm.toggle(id); // true trở lại
lm.remove(id);
```

---

## Tổng kết

| Class | Vai trò | Kích thước (dòng) |
|---|---|---|
| `VNGisMap` | Facade, điều phối tổng thể | 400 |
| `ApiClient` | HTTP, cache, auth, validate | 390 |
| `EventEmitter` | Pub/sub typed nội bộ | 50 |
| `LayerManager` | Registry layer | 140 |

Mọi thứ liên kết với nhau thông qua các **private field** trong `VNGisMap`:

```
VNGisMap
  ├── renderer: IRenderer                (LeafletRenderer | MapLibreRenderer | ...)
  ├── api: ApiClient                     (HTTP + cache)
  ├── layerManager: LayerManager(renderer)
  └── emitter: EventEmitter              (forward events từ renderer)
```
