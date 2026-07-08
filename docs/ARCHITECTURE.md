# Kiến trúc tổng quan — `@vn-gis/map`

Tài liệu này mô tả kiến trúc tổng thể của package, các thành phần chính, mối liên hệ giữa chúng và cách luồng dữ liệu chảy trong hệ thống. Nếu bạn mới tham gia dự án, hãy đọc file này trước tiên.

---

## 1. Mục tiêu của package

`@vn-gis/map` là một thư viện TypeScript được thiết kế để:

- **Hiển thị bản đồ hành chính Việt Nam**: tỉnh/thành phố và xã/phường với dữ liệu GeoJSON.
- **Tích hợp với `vn-gis-api`**: tự động gọi API, cache, xác thực Bearer token, hỗ trợ cả `raw` GeoJSON lẫn envelope `{ data, meta }`.
- **Hỗ trợ hai renderer** (Leaflet và MapLibre GL JS) thông qua cùng một API.
- **Không bundle cứng các thư viện bản đồ**: renderer là peer dependency, người dùng tự truyền vào, tránh làm phồng bundle.

Thư viện hướng tới **framework-agnostic** (vanilla JS/TS, React, Vue, Next.js đều dùng được).

---

## 2. Sơ đồ kiến trúc phân lớp

```
┌────────────────────────────────────────────────────────────────────┐
│                         Người dùng (App)                            │
│   - Vanilla JS / React / Vue / Next.js / Angular / Svelte          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ new VNGisMap(config, factory)
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                  CORE  (src/core/*)                                 │
│   VNGisMap                                                          │
│     ├─ ApiClient       → HTTP + cache + auth                        │
│     ├─ EventEmitter    → pub/sub sự kiện nội bộ                     │
│     └─ LayerManager    → registry layer + uỷ quyền renderer         │
└──────────┬─────────────────────────────┬─────────────────────────────┘
           │ (forward events)           │ (add/remove/update layers)
           ▼                             ▼
┌────────────────────────────────────────────────────────────────────┐
│          RENDERER ADAPTERS  (src/renderers/*)                       │
│   IRenderer (interface chung)                                       │
│     ├─ LeafletRenderer    → dùng leaflet (peer dep)                │
│     └─ MapLibreRenderer   → dùng maplibre-gl (peer dep)            │
└──────────┬─────────────────────────────┬─────────────────────────────┘
           │ wrap                       │ thật
           ▼                             ▼
    ┌──────────────┐         ┌──────────────────────┐
    │   Leaflet    │         │   maplibre-gl        │
    │ (peer-dep)   │         │   (peer-dep)         │
    └──────────────┘         └──────────────────────┘

       ┌───────────────────────┐         ┌──────────────────┐
       │  VN-GIS-API  (B/E)    │         │  External GeoJSON│
       │   /v1/gis/*, /v1/auth │         │  (any CDN/URL)   │
       └───────────────────────┘         └──────────────────┘
```

---

## 3. Các nguyên tắc thiết kế

### 3.1. Adapter pattern (Renderer-agnostic)

`IRenderer` định nghĩa một hợp đồng chung cho mọi nền tảng bản đồ. Nhờ đó:

- `VNGisMap` không phụ thuộc trực tiếp Leaflet hay MapLibre.
- Thêm renderer mới (ví dụ OpenLayers) chỉ cần implement `IRenderer`.
- `LayerManager` chỉ làm việc với interface, dễ test với mock renderer.

### 3.2. Dependency Injection cho renderer

Renderer được inject thông qua `rendererFactory`, vì nó là **peer dependency**:

```ts
new VNGisMap(config, () => new LeafletRenderer(L));
```

Điều này tránh bundle kích thước lớn (không kéo theo Leaflet/MapLibre), tránh trùng version và tuân thủ tốt thực tiễn của hệ sinh thái.

### 3.3. Sub-path exports

`package.json` export 3 entry points:

- `@vn-gis/map`            → core + types + utils (không bao gồm renderer).
- `@vn-gis/map/leaflet`    → chỉ `LeafletRenderer`.
- `@vn-gis/map/maplibre`   → chỉ `MapLibreRenderer`.

Tree-shaking sẽ loại bỏ renderer không dùng tới.

### 3.4. Hỗ trợ đa định dạng response

`ApiClient` có 3 chế độ:

| `responseFormat` | Mô tả |
|---|---|
| `raw` (mặc định) | API trả về GeoJSON trực tiếp. |
| `envelope`       | API wrap trong `{ data, meta }` (TransformInterceptor). |
| `auto`           | Tự nhận dạng dựa trên cấu trúc body. |

### 3.5. Cache TTL có kiểm soát

Tất cả endpoint GeoJSON được cache theo TTL (mặc định 600s). Đổi token ⇒ tự động clear cache.

### 3.6. Strict typing toàn bộ

TypeScript `strict: true` + `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`. Mọi public API đều có JSDoc + type declarations xuất ra `dist/*.d.ts`.

---

## 4. Luồng dữ liệu chính

### 4.1. Khởi tạo map

```
Người dùng
   │  new VNGisMap(config, () => new LeafletRenderer(L))
   ▼
VNGisMap.constructor
   ├─► renderer = factory(config)              // tạo renderer instance
   ├─► api = new ApiClient({...})              // HTTP + cache client
   ├─► layerManager = new LayerManager(...)    // registry
   └─► init()
        ├─► renderer.initialize(container, opts)
        └─► renderer.on('ready', ...)          // listener nội bộ
              ├─► this.ready = true
              ├─► fitBounds (nếu có initialBounds)
              ├─► loadInitialLayers()          // provinces/wards/custom
              └─► emitter.emit('ready', ...)
```

### 4.2. Hiển thị tỉnh/thành (`showProvinces()`)

```
VNGisMap.showProvinces(opts)
   │
   ├─► ApiClient.getProvinces()
   │     ├─► ensureToken()                    // auto-login nếu cần
   │     ├─► cache.get('gis:provinces')       // cache hit ?
   │     │     └─► trả về cached (skip HTTP)
   │     ├─► HTTP GET /v1/gis/provinces
   │     └─► cache.set('gis:provinces', data)
   │
   ├─► LayerManager.add(id, 'provinces', geojson, opts)
   │     └─► renderer.addGeoJSON(geojson, opts, id)
   │
   └─► wireLayerClick(id, callback)           // gắn sự kiện click
```

### 4.3. Sự kiện

```
Leaflet/MapLibre native event
   │
   ▼
Renderer.dispatch(event, payload)
   │  (gọi các handler đã on() trên renderer)
   ▼
VNGisMap.forwardRendererEvents()        // re-emit qua EventEmitter
   │
   ▼
listener do người dùng đăng ký qua map.on(...)
```

### 4.4. Hủy map

```
VNGisMap.destroy()
   ├─► LayerManager.clear()                  // remove all layers
   ├─► renderer.destroy()                    // remove map, cleanup DOM
   ├─► emitter.removeAllListeners()
   ├─► api.clearCache()
   └─► ready = false
```

---

## 5. Phân lớp rủi ro / Trách nhiệm

| Lớp | Trách nhiệm | KHÔNG chịu trách nhiệm |
|---|---|---|
| `VNGisMap` | Điều phối tổng thể, forward sự kiện, quản lý vòng đời | Render trực tiếp lên DOM |
| `ApiClient` | HTTP, auth, caching, parse response | Render bản đồ |
| `LayerManager` | Registry layer + uỷ quyền renderer | Style chi tiết (do renderer xử lý) |
| `EventEmitter` | Pub/sub nội bộ | Biết về Leaflet/MapLibre |
| `IRenderer` | Hợp đồng chung cho mọi nền tảng | Biết về VNGisMap hay ApiClient |
| `LeafletRenderer` / `MapLibreRenderer` | Gom style/interaction vào native API | Quyết định dữ liệu nào hiển thị |

---

## 6. Đối tượng tham chiếu nhanh

| File / Class | Trách nhiệm chính |
|---|---|
| `src/index.ts` | Entry point export core API |
| `src/core/VNGisMap.ts` | Lớp chính, API cấp cao |
| `src/core/ApiClient.ts` | HTTP client + cache + auth |
| `src/core/EventEmitter.ts` | Pub/sub typed |
| `src/core/LayerManager.ts` | Quản lý layer |
| `src/renderers/base/IRenderer.ts` | Interface chung cho renderer |
| `src/renderers/leaflet/LeafletRenderer.ts` | Adapter Leaflet |
| `src/renderers/maplibre/MapLibreRenderer.ts` | Adapter MapLibre |
| `src/utils/bounds.ts` | Hằng số vị trí Việt Nam |
| `src/utils/cache.ts` | TTL Cache |
| `src/utils/style.ts` | Style presets và helper merge |
| `src/types/*.ts` | Khai báo type |
| `tests/*.test.ts` | Unit test với vitest |
| `examples/*.html` | Demo chạy trực tiếp trên browser |

---

## 7. Khi nào nên đọc tài liệu nào?

| Bạn muốn… | Đọc file |
|---|---|
| Hiểu cấu trúc thư mục vật lý | [`STRUCTURE.md`](./STRUCTURE.md) |
| Hiểu từng hàm trong `src/core/*` | [`CORE.md`](./CORE.md) |
| Hiểu renderer adapter | [`RENDERERS.md`](./RENDERERS.md) |
| Hiểu type system | [`TYPES.md`](./TYPES.md) |
| Hiểu tiện ích (cache, bounds, style) | [`UTILS.md`](./UTILS.md) |
| Hiểu cách chạy test | [`TESTING.md`](./TESTING.md) |
| Hiểu pipeline CI/CD | [`CI-CD.md`](./CI-CD.md) |
| Xem ví dụ chạy thực tế | [`EXAMPLES.md`](./EXAMPLES.md) |

---

## 8. Tóm tắt một câu

> Thư viện được thiết kế theo mô hình **Adapter + Dependency Injection**, trong đó `VNGisMap` là facade duy nhất người dùng tương tác, ủy quyền 3 việc: gọi API (`ApiClient`), render bản đồ (`IRenderer` implementations), quản lý layer (`LayerManager`), và thông báo sự kiện (`EventEmitter`).
