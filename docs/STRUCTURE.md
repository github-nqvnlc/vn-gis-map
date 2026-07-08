# Cấu trúc thư mục dự án — `@vn-gis/map`

Tài liệu này liệt kê toàn bộ file/thư mục trong repo, kèm **mục đích** và **cách sử dụng**. Nội dung được sắp xếp theo thứ tự alphabet để dễ tra cứu.

---

## Cây thư mục tổng thể

```
vn-gis-map-package/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .gitignore
├── .prettierrc
├── .prettierrc.json
├── CHANGELOG.md
├── LICENSE
├── README.md
├── docs/                             ← (tài liệu bạn đang đọc)
│   ├── ARCHITECTURE.md
│   ├── STRUCTURE.md                  ← file này
│   ├── CORE.md
│   ├── RENDERERS.md
│   ├── TYPES.md
│   ├── UTILS.md
│   ├── TESTING.md
│   ├── RELEASE.md
│   ├── CI-CD.md
│   ├── EXAMPLES.md
│   └── README.md
├── eslint.config.js
├── examples/
│   ├── leaflet.html
│   └── maplibre.html
├── package.json
├── package-lock.json
├── rollup.config.ts
├── src/                              ← source code chính
│   ├── index.ts                      ← entry point
│   ├── core/
│   │   ├── ApiClient.ts
│   │   ├── EventEmitter.ts
│   │   ├── LayerManager.ts
│   │   └── VNGisMap.ts
│   ├── renderers/
│   │   ├── base/
│   │   │   └── IRenderer.ts
│   │   ├── leaflet/
│   │   │   ├── LeafletRenderer.ts
│   │   │   └── index.ts
│   │   └── maplibre/
│   │       ├── MapLibreRenderer.ts
│   │       └── index.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── config.types.ts
│   │   ├── geojson.types.ts
│   │   └── index.ts
│   └── utils/
│       ├── bounds.ts
│       ├── cache.ts
│       ├── style.ts
│       └── index.ts
├── tests/                            ← unit test (vitest)
│   ├── apiclient.test.ts
│   ├── bounds.test.ts
│   ├── cache.test.ts
│   ├── eventemitter.test.ts
│   ├── geojson.test.ts
│   ├── layermanager.test.ts
│   └── style.test.ts
├── tsconfig.json
├── tsconfig.eslint.json
├── vitest.config.ts
└── vn-gis-map-0.1.0.tgz               ← gói npm đã pack (build artifact)
```

---

## File / Thư mục chi tiết

### `.github/` — GitHub configuration

| File | Mục đích |
|---|---|
| `.github/workflows/ci.yml` | Workflow CI: chạy lint, typecheck, format check, test (Node 20 & 22), build. Trigger khi push/PR vào `main`, `master`, `develop`. |
| `.github/workflows/release.yml` | Workflow publish: khi push tag `v*`, verify tag trùng version, build, publish lên npm và tạo GitHub Release. |

Xem chi tiết trong [`CI-CD.md`](./CI-CD.md).

---

### File cấu hình gốc

| File | Mục đích |
|---|---|
| `.gitignore` | Loại trừ `node_modules`, `dist`, `coverage`, `.tgz`… khỏi git. |
| `.prettierrc` / `.prettierrc.json` | Cấu hình Prettier (cả 2 tồn tại để tương thích editor khác nhau). |
| `CHANGELOG.md` | Lịch sử phiên bản theo chuẩn [Keep a Changelog](https://keepachangelog.com/). |
| `LICENSE` | Giấy phép MIT. |
| `README.md` | Tài liệu chính cho người dùng cuối (hướng dẫn cài đặt, API, ví dụ). |
| `eslint.config.js` | Cấu hình ESLint v9 (flat config). Parser cho TypeScript, hỗ trợ Prettier. |
| `package.json` | Khai báo package, scripts, dependencies. |
| `package-lock.json` | Lockfile npm. |
| `rollup.config.ts` | Cấu hình Rollup để build ra ESM/CJS/UMD + `.d.ts`. |
| `tsconfig.json` | Cấu hình TypeScript chính (target ES2020, strict mode). |
| `tsconfig.eslint.json` | Cấu hình TS riêng cho ESLint (extends từ `tsconfig.json`). |
| `vitest.config.ts` | Cấu hình Vitest — dùng `jsdom`, V8 coverage. |
| `vn-gis-map-0.1.0.tgz` | Gói npm đã đóng gói (`npm pack`). |

---

### `docs/` — Tài liệu kỹ thuật (Markdown)

| File | Mô tả |
|---|---|
| `docs/README.md` | Trang index cho `docs/` — liên kết đến các file con. |
| `docs/ARCHITECTURE.md` | Sơ đồ kiến trúc tổng thể, nguyên tắc thiết kế, luồng dữ liệu. |
| `docs/STRUCTURE.md` | File này — cây thư mục + giải thích mục đích của từng file. |
| `docs/CORE.md` | Chi tiết từng class/hàm trong `src/core/*`. |
| `docs/RENDERERS.md` | Chi tiết `IRenderer` và 2 adapter Leaflet/MapLibre. |
| `docs/TYPES.md` | Hệ thống type. |
| `docs/UTILS.md` | Tiện ích (bounds, cache, style). |
| `docs/TESTING.md` | Hướng dẫn testing + coverage. |
| `docs/RELEASE.md` | Quy trình release, versioning, publish. |
| `docs/CI-CD.md` | Workflow GitHub Actions. |
| `docs/EXAMPLES.md` | Phân tích HTML examples. |

---

### `examples/` — Demo chạy trên browser

| File | Mô tả |
|---|---|
| `examples/leaflet.html` | Demo đầy đủ với Leaflet: bản đồ tỉnh/xã, click để reverse geocode. |
| `examples/maplibre.html` | Bản tương tự với MapLibre GL JS. |

Chi tiết xem tại [`EXAMPLES.md`](./EXAMPLES.md).

Cú pháp import local:

```ts
import { VNGisMap } from '../dist/index.esm.js';
import { LeafletRenderer } from '../dist/renderers/leaflet.esm.js';
```

---

### `src/` — Source code (được build ra `dist/`)

#### `src/index.ts` — Entry point chính

Export:
- Core class: `VNGisMap`, `ApiClient`, `EventEmitter`, `LayerManager`, `ApiClientError`.
- Renderer interface: `IRenderer`, `MapInitOptions`.
- Types: `VNGeoJSONFeature`, `VNGeoJSONCollection`, `LookupResult`, `VNMapConfig`, `LayerOptions`, `LayerStyle`, …
- Utils: `VN_BOUNDS`, `Cache`, `mergeStyle`, `VN_STYLE_PRESETS`, …
- Type guard: `isFeatureCollection`, `isFeature`.

#### `src/core/` — Logic chính

| File | Mục đích | Xem tại |
|---|---|---|
| `VNGisMap.ts` | Class chính, facade cho mọi thao tác (showProvinces, fitBounds, on…). | [`CORE.md`](./CORE.md#vngismap) |
| `ApiClient.ts` | HTTP client: gọi `vn-gis-api`, cache TTL, login, validate. | [`CORE.md`](./CORE.md#apiclient) |
| `EventEmitter.ts` | Pub/sub typed — dùng để forward sự kiện từ renderer. | [`CORE.md`](./CORE.md#eventemitter) |
| `LayerManager.ts` | Registry layer (provinces/wards/custom), uỷ quyền thao tác cho renderer. | [`CORE.md`](./CORE.md#layermanager) |

#### `src/renderers/` — Adapter cho từng nền tảng bản đồ

| File | Mục đích | Xem tại |
|---|---|---|
| `base/IRenderer.ts` | Interface chung — hợp đồng mọi adapter phải tuân thủ. | [`RENDERERS.md`](./RENDERERS.md#irenderer) |
| `leaflet/LeafletRenderer.ts` | Adapter cho Leaflet. Inject `L` qua constructor. | [`RENDERERS.md`](./RENDERERS.md#leafletrenderer) |
| `leaflet/index.ts` | Sub-path export: `export { LeafletRenderer }`. | [`RENDERERS.md`](./RENDERERS.md#sub-path-export) |
| `maplibre/MapLibreRenderer.ts` | Adapter cho MapLibre GL JS. Inject `maplibregl` qua constructor. | [`RENDERERS.md`](./RENDERERS.md#maplibrerenderer) |
| `maplibre/index.ts` | Sub-path export: `export { MapLibreRenderer }`. | [`RENDERERS.md`](./RENDERERS.md#sub-path-export) |

#### `src/types/` — Khai báo TypeScript

| File | Nội dung |
|---|---|
| `api.types.ts` | `VNGeoJSONFeatureProperties`, `VNGeoJSONFeature`, `VNGeoJSONCollection`, `LookupResult`, `ApiEnvelope`, `ApiError`, `AuthUser`, `ValidateResult`, `LoginResult`. |
| `config.types.ts` | `VNMapConfig`, `InitialLayers`, `LayerStyle`, `LayerOptions`, `PopupOptions`, `Bounds`, `LngLat`, `RegisteredLayer`, `MapEvent`, `MapEventPayload`, `EventHandler`. |
| `geojson.types.ts` | Re-export standard `Feature`, `FeatureCollection`, `Geometry`, … + type guards `isFeatureCollection`, `isFeature`. |
| `index.ts` | Tổng hợp, gom tất cả type và export một chỗ. |

Chi tiết xem tại [`TYPES.md`](./TYPES.md).

#### `src/utils/` — Tiện ích

| File | Nội dung |
|---|---|
| `bounds.ts` | Hằng số: `VN_BOUNDS`, `VN_DEFAULT_ZOOM`, `VN_CENTER_LATLNG`, `VN_CENTER_LNGLAT`, `VN_MAP_ZOOM`. |
| `cache.ts` | `Cache<T>` — TTL cache in-memory đơn giản. |
| `style.ts` | `DEFAULT_PROVINCE_STYLE`, `DEFAULT_WARD_STYLE`, `DEFAULT_CUSTOM_STYLE`, `VN_STYLE_PRESETS`, `mergeStyle()`. |
| `index.ts` | Sub-export từ 3 file trên. |

Chi tiết xem tại [`UTILS.md`](./UTILS.md).

---

### `tests/` — Unit test với Vitest

| File | Mục đích |
|---|---|
| `tests/apiclient.test.ts` | Test cho `ApiClient`: HTTP, cache, login, validate, auto-login, setToken, clearCache. |
| `tests/bounds.test.ts` | Test cho hằng số bounds Việt Nam. |
| `tests/cache.test.ts` | Test cho `Cache`: TTL mặc định + override, `has`, `delete`, `purgeExpired`. |
| `tests/eventemitter.test.ts` | Test cho `EventEmitter`: `on`, `off`, `once`, multiple handlers, error isolation, `removeAllListeners`. |
| `tests/geojson.test.ts` | Test cho type guards `isFeature`, `isFeatureCollection`. |
| `tests/layermanager.test.ts` | Test cho `LayerManager` với mock `IRenderer`: add, replace, remove, setStyle, setVisibility, toggle, list, size. |
| `tests/style.test.ts` | Test cho `mergeStyle` và các style presets. |

Số test case khoảng 60+. Chi tiết xem tại [`TESTING.md`](./TESTING.md).

---

### Thư mục sinh ra khi build/test

| Thư mục | Mô tả |
|---|---|
| `dist/` | Sau khi `npm run build`. Chứa `index.{esm,cjs,umd}.js`, `.d.ts`, và `renderers/{leaflet,maplibre}.{esm,cjs,d.ts}`. Được publish lên npm. |
| `coverage/` | Sau khi `npm run test:coverage`. Báo cáo V8 coverage (HTML + JSON + text). |
| `node_modules/` | Quản lý bởi npm. |

---

## Quy ước đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File Source | PascalCase cho class, camelCase cho util | `VNGisMap.ts`, `cache.ts` |
| Folder | lowercase, kebab-case nếu nhiều từ | `core/`, `renderers/`, `leaflet/` |
| Public class | PascalCase, có prefix VN- khi liên quan | `VNGisMap`, `LeafletRenderer` |
| Interface | PascalCase, không có prefix `I` | `VNMapConfig`, `IRenderer` (bị phá lệ — đây là interface adapter) |
| Type alias | PascalCase | `LayerStyle`, `Bounds` |
| Hằng số | UPPER_SNAKE_CASE cho hằng số toàn cục | `VN_BOUNDS`, `DEFAULT_TILE_URL` |

---

## Phụ thuộc chính (package.json)

| Tên | Loại | Vai trò |
|---|---|---|
| `leaflet` | **peer** (optional) | Renderer Leaflet |
| `maplibre-gl` | **peer** (optional) | Renderer MapLibre |
| `rollup` + plugins | dev | Build ESM/CJS/UMD + `.d.ts` |
| `typescript` | dev | Trình biên dịch TS |
| `vitest` + `jsdom` + `@vitest/coverage-v8` | dev | Testing + coverage |
| `eslint` + plugins | dev | Lint |
| `prettier` | dev | Format code |
| `typedoc` | dev | Sinh API doc (chưa dùng — script `docs` đã có sẵn) |

Không có runtime dependencies, chỉ có **peer dependencies**.
