# Chi tiết `src/renderers/*` — Adapter cho nền tảng bản đồ

Lớp renderer là cầu nối giữa code chung (renderer-agnostic) của package và API gốc của từng thư viện bản đồ. Nhờ có lớp này, `VNGisMap` không cần biết nó đang dùng Leaflet hay MapLibre.

---

## `IRenderer` — interface chung

**File**: `src/renderers/base/IRenderer.ts` (~95 dòng).

### Mục đích

Định nghĩa **hợp đồng** mà mọi adapter phải tuân thủ. Đây là "adapter pattern" cổ điển:

- `VNGisMap` / `LayerManager` chỉ thao tác qua `IRenderer`.
- Có thể thay thế renderer lúc runtime.
- Dễ mock trong unit test.

### Interface chính

```ts
export interface MapInitOptions {
  center: LngLat;        // [lng, lat]
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  tileUrl?: string;      // template URL, vd OSM
  attribution?: string;
}

export interface IRenderer {
  initialize(container: HTMLElement, options: MapInitOptions): void;
  setView(center: LngLat, zoom: number): void;
  fitBounds(bounds: Bounds): void;
  addGeoJSON(geojson: VNGeoJSONCollection, options: LayerOptions, layerId?: string): string;
  removeLayer(layerId: string): void;
  setLayerStyle(layerId: string, style: LayerStyle): void;
  setLayerVisibility(layerId: string, visible: boolean): void;
  on(event: MapEvent | string, handler: EventHandler): void;
  off(event: MapEvent | string, handler: EventHandler): void;
  onLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void;
  offLayerClick(layerId: string, handler: (feature: VNGeoJSONFeature) => void): void;
  destroy(): void;
  readonly isInitialized: boolean;
}
```

### Ý nghĩa từng method

| Method | Bắt buộc | Mô tả chi tiết |
|---|---|---|
| `initialize` | ✅ | Tạo bản đồ gắn vào `container` với tile/attribution. Phải phát event `'ready'` khi xong. |
| `setView` | ✅ | Di chuyển đến `center` + `zoom`. |
| `fitBounds` | ✅ | Zoom vừa khít `bounds` (SW/NE). |
| `addGeoJSON` | ✅ | Thêm 1 layer, trả `layerId` (id do adapter tự sinh nếu không truyền). |
| `removeLayer` | ✅ | Xoá layer khỏi bản đồ. |
| `setLayerStyle` | ✅ | Áp style mới (merge với style cũ). |
| `setLayerVisibility` | ✅ | Ẩn/hiện layer (giữ state trong registry). |
| `on`/`off` | ✅ | Pub/sub cho map events. |
| `onLayerClick`/`offLayerClick` | ✅ | Per-layer click — quan trọng để VNGisMap.route click tới callback đăng ký (`onProvinceClick`, `onWardClick`, …). |
| `destroy` | ✅ | Cleanup DOM, layers, listeners. |
| `isInitialized` | ✅ | Getter — `true` sau khi `initialize()` thành công. |

### Events mà renderer phải phát ra

| Event | Khi nào | Payload |
|---|---|---|
| `'ready'` | Sau khi map hiển thị tile đầu tiên | `{ target }` |
| `'load'` | (MapLibre) khi `map.on('load')` | `{ target }` |
| `'click'` | Click trên map hoặc feature | `{ target, lngLat, feature?, layerId? }` |
| `'mousemove'` | Di chuyển chuột | `{ target, lngLat }` |
| `'zoomstart'`/`'zoomend'` | Trước/sau khi zoom | `{ target }` |
| `'movestart'`/`'moveend'` | Trước/sau khi pan | `{ target }` |
| `'error'` | Lỗi không mong đợi | `{ target, error }` |

`VNGisMap.forwardRendererEvents()` sẽ wrap các event này lại để thêm `target = this` (= VNGisMap) trước khi phát ra ngoài.

---

## `LeafletRenderer` — adapter Leaflet

**File**: `src/renderers/leaflet/LeafletRenderer.ts` (~310 dòng).

### Tổng quan

Adapter này map `IRenderer` lên API gốc của [Leaflet 1.9.x](https://leafletjs.com). Leaflet được inject thông qua constructor (do là peer dependency).

### Constructor

```ts
constructor(leaflet?: LeafletModule)  // leaflet = import('leaflet')
```

- Nếu truyền `leaflet` (vd `import * as L from 'leaflet'`) → dùng nó.
- Nếu không, lấy `window.L` (UMD load qua `<script>`).
- Throw nếu không tìm được.

### Các hằng số cục bộ

| Tên | Giá trị | Mục đích |
|---|---|---|
| `DEFAULT_TILE_URL` | Carto basemap `light_nolabels` | Nền bản đồ mặc định (có thể override qua `tileUrl`). |
| `DEFAULT_ATTRIBUTION` | OpenStreetMap contributors | Attribution mặc định. |

### Thuộc tính private

| Field | Kiểu | Mục đích |
|---|---|---|
| `L` | `typeof import('leaflet')` | Module Leaflet đã resolve. |
| `map` | `L.Map \| null` | Instance gốc (null cho tới khi initialize). |
| `tileLayer` | `L.TileLayer \| null` | Layer nền. |
| `layers` | `Map<string, LeafletLayerEntry>` | Registry các layer đã add (id → entry). |
| `layerCounter` | `number` | Đếm tăng để tạo id tự động `layer-1`, `layer-2`… |
| `eventHandlers` | `Map<string, Set<EventHandler>>` | Bộ lưu handler cho `on/off`. |

### `LeafletLayerEntry`

```ts
interface LeafletLayerEntry {
  layer: L.GeoJSON;                       // native leaflet layer
  options: LayerOptions;                  // gốc options khi add
  style: LayerStyle;                      // style đang áp dụng (sau merge)
  clickHandlers: Set<(feature) => void>;  // các click handler đăng ký
}
```

### Phương thức public

| Method | Mô tả chi tiết |
|---|---|
| `isInitialized` (getter) | `true` khi `map !== null`. |
| `initialize(container, options)` | Tạo `L.map(container, { center: [lat, lng], zoom, minZoom, maxZoom })`. Thêm tile layer. Bind sự kiện `click/movestart/moveend/zoomstart/zoomend`. Sau khi `whenReady` → emit `'ready'`. |
| `setView(center, zoom)` | `L.setView([lat, lng], zoom)` (Leaflet dùng lat-lng). |
| `fitBounds(bounds)` | `L.fitBounds([[south, west], [north, east]])`. |
| `addGeoJSON(geojson, options, layerId?)` | Tạo `L.geoJSON(geojson, { style, onEachFeature })`. Nếu có `interactive` gắn mouseover/mouseout/click/popup/tooltip. Lưu entry. |
| `removeLayer(id)` | Xoá layer entry, gọi `L.removeLayer(entry.layer)`. |
| `setLayerStyle(id, style)` | Merge style vào entry.style rồi `layer.setStyle(...)` với function style mới. |
| `setLayerVisibility(id, visible)` | Nếu visible và chưa có → `addTo(map)`. Nếu không → `removeLayer(...)`. |
| `on(event, handler)` / `off(event, handler)` | Quản lý trong `eventHandlers`. Khi dispatch, gọi tất cả handler với payload `MapEventPayload`. |
| `onLayerClick(id, handler)` / `offLayerClick(id, handler)` | Thêm/xoá handler vào `entry.clickHandlers`. Khi click trên feature → gọi tất cả handler. |
| `destroy()` | `layers.clear()`, `eventHandlers.clear()`, `map.remove()`, `map = null`, `tileLayer = null`. |
| `getNativeMap()` | Trả về `L.Map \| null`. **Không nằm trong `IRenderer`** nhưng được export cho advanced use-cases. |

### Style conversion

Vì Leaflet dùng tên thuộc tính khác (`color`, `weight` thay vì `strokeColor`, `strokeWidth`), method private `toLeafletPathStyle()` thực hiện ánh xạ:

```ts
{
  fillColor,                  // giữ nguyên
  fillOpacity,                // giữ nguyên
  color: style.strokeColor,   // map
  weight: style.strokeWidth,  // map
}
```

Cũng hỗ trợ `styleFunction` (dynamic style) — gọi với mỗi feature.

### Hover effect

Với `interactive = true` (mặc định), mỗi `L.Path` được gắn:

- `mouseover` → `setStyle({ fillColor: hoverFillColor || fillColor, color: hoverStrokeColor || strokeColor, weight: +1, fillOpacity: +0.15 capped 1 })` và `bringToFront()`.
- `mouseout` → trả về style gốc.
- `click` → `L.DomEvent.stopPropagation` để không bubble lên map → gọi các `clickHandlers` rồi dispatch event `'click'`.

### Popup & Tooltip

Khi `options.popup = true` hoặc `options.popup = { contentTemplate }`:

- `bindPopup(content)` được gắn lên path. Mặc định build HTML từ `properties.fullName / full_name / name / code` + `area_km2`.

Khi `options.tooltip = true` hoặc `options.tooltip = "<string>"`:

- `bindTooltip(string, { sticky: true })`. Nếu `true` (không phải string) → dùng `properties.name` / `fullName`.

### HTML escape

`escapeHtml(str)` — chuyển `& < > "` để chống XSS khi render popup.

### Ví dụ

```ts
import * as L from 'leaflet';
import { LeafletRenderer } from '@vn-gis/map/leaflet';

const renderer = new LeafletRenderer(L);
const container = document.getElementById('map')!;
renderer.initialize(container, {
  center: [106.0, 16.0],
  zoom: 6,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '© OpenStreetMap contributors',
});
```

---

## `MapLibreRenderer` — adapter MapLibre GL JS

**File**: `src/renderers/maplibre/MapLibreRenderer.ts` (~380 dòng).

### Tổng quan

Adapter này map `IRenderer` lên API của [MapLibre GL JS 4/5](https://maplibre.org/maplibre-gl-js/docs/). Giống Leaflet, module được inject.

### Khác biệt kiến trúc so với Leaflet

| Đặc điểm | Leaflet | MapLibre |
|---|---|---|
| Add GeoJSON | `L.geoJSON(...)` trả về `L.Layer` | Cần `addSource` (geojson) + `addLayer` (fill, line) riêng. |
| Layer đơn vị | 1 layer | Mỗi entry có **3 native id**: `sourceId`, `fillLayerId`, `lineLayerId`. |
| Sự kiện load | `whenReady` đồng bộ | `'load'` event — async. Cần queue mọi op. |
| Style update | `layer.setStyle(fn)` | `setPaintProperty(layerId, prop, value)` cho từng paint prop. |
| Visibility | `addTo` / `removeLayer` | `setLayoutProperty(layerId, 'visibility', 'visible'/'none')`. |
| Thứ tự toạ độ | `[lat, lng]` | `[lng, lat]` (chuẩn GeoJSON). |
| Zoom level | Như người dùng truyền | Renderer **trừ 1** cho `setView` và init (để bù chênh lệch giữa Leaflet & MapLibre). |

### `MapLibreLayerEntry`

```ts
interface MapLibreLayerEntry {
  sourceId: string;                              // `${id}-src`
  fillLayerId: string;                           // `${id}-fill`
  lineLayerId: string;                           // `${id}-line`
  options: LayerOptions;
  style: LayerStyle;
  clickHandlers: Set<(feature) => void>;
  interactive: boolean;
}
```

### Constructor

```ts
constructor(maplibre?: MapLibreModule)  // maplibre = import('maplibre-gl')
```

- Nếu truyền → dùng nó.
- Nếu không, lấy `window.maplibregl`.
- Throw nếu không có.

### Pending ops queue

Do `initialize()` tạo map **async** (chờ `'load'`), mọi operation phụ thuộc map (`addGeoJSON`, `removeLayer`, `setLayerStyle`, `setLayerVisibility`) đều phải queue nếu map chưa load xong:

```ts
private pendingOps: Array<() => void> = [];

private flushPending(): void {
  const ops = this.pendingOps;
  this.pendingOps = [];
  ops.forEach((op) => op());
}
```

Sau khi `map.on('load')` chạy, `this.loaded = true` và `flushPending()` được gọi để thực thi tuần tự các op chờ.

### Style default (MapLibre)

Khi không truyền style:

```ts
fill-color    = '#4a90d9'
fill-opacity  = 0.2
line-color    = '#2c6fad'
line-width    = 1.5
```

(Hard-coded — vì MapLibre luôn cần giá trị cụ thể trong `paint`.)

### Phương thức public

Tương tự `LeafletRenderer`, ngoại trừ:

| Method | Đặc thù |
|---|---|
| `setView(center, zoom)` | `map.jumpTo({ center, zoom: zoom - 1 })` |
| `fitBounds(bounds)` | `fitBounds([[west, south], [east, north]], { padding: 20 })` |
| `addGeoJSON(...)` | Queue hoặc gọi thẳng. Trả id ngay để caller dùng. |
| `removeLayer(id)` | Xoá `fillLayerId`, `lineLayerId`, `sourceId`. Queue nếu chưa loaded. |
| `setLayerStyle(id, style)` | Dùng `setPaintProperty` cho từng key (`fill-color`, `fill-opacity`, `line-color`, `line-width`). |
| `setLayerVisibility(id, v)` | `setLayoutProperty(layerId, 'visibility', 'visible'|'none')` cho cả 2 layer. |

### Hover effect

MapLibre event handlers được gắn vào `fillLayerId`:

- `mouseenter` → `getCanvas().style.cursor = 'pointer'`, set `fill-color` = `hoverFillColor`, opacity + 0.15.
- `mouseleave` → reset cursor và paint.
- `click` → gọi clickHandlers + dispatch + mở popup (nếu có).

### Popup

`MapLibreRenderer` tạo 1 popup instance dùng chung:

```ts
this.popup = new this.maplibre.Popup({ closeButton: true, closeOnClick: true });
```

Khi click feature có `popup` → `popup.setLngLat(...).setHTML(content).addTo(map)`.

### Phương thức không thuộc `IRenderer`

- `getNativeMap()` — trả về `maplibregl.Map \| null`.

### Ví dụ

```ts
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapLibreRenderer } from '@vn-gis/map/maplibre';

const renderer = new MapLibreRenderer(maplibregl);
renderer.initialize(document.getElementById('map')!, {
  center: [106.0, 16.0],
  zoom: 6,
});
```

---

## Sub-path export

**File**: `src/renderers/leaflet/index.ts` và `src/renderers/maplibre/index.ts`.

Cả 2 file chỉ có 1 dòng:

```ts
export { LeafletRenderer } from './LeafletRenderer';
// hoặc
export { MapLibreRenderer } from './MapLibreRenderer';
```

Trong `package.json`, mục `exports` khai báo:

```json
"./leaflet": {
  "types": "./dist/renderers/leaflet.d.ts",
  "import": "./dist/renderers/leaflet.esm.js",
  "require": "./dist/renderers/leaflet.cjs.js"
},
"./maplibre": { "...": "..." }
```

Rollup build tách riêng 2 entry này (`rollup.config.ts`), kết quả:

```
dist/
  renderers/
    leaflet.esm.js
    leaflet.cjs.js
    leaflet.d.ts
    maplibre.esm.js
    maplibre.cjs.js
    maplibre.d.ts
```

Nhờ vậy người dùng có thể import gọn:

```ts
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import { MapLibreRenderer } from '@vn-gis/map/maplibre';
```

và tree-shaking sẽ loại bỏ renderer không sử dụng.

---

## So sánh nhanh Leaflet vs MapLibre

| Tính năng | Leaflet | MapLibre GL JS |
|---|---|---|
| Bundle size | Nhỏ (~40KB) | Lớn (~200KB) nhưng có WebGL |
| Hiệu năng với nhiều feature | Trung bình (DOM) | Cao (WebGL) |
| 3D / pitch / bearing | Không | Có |
| Vector tiles | Qua plugin | Tự nhiên |
| Cú pháp toạ độ | `[lat, lng]` | `[lng, lat]` |
| Tích hợp Raster | Tile layer đơn giản | Qua style spec |
| API "geojson layer" | `L.geoJSON(...)` | `addSource + addLayer` |

> Trong package này, MapLibreRenderer đã chỉnh `zoom` đi -1 để đồng nhất UX giữa 2 renderer. Người dùng truyền cùng một số `zoom` và thấy kết quả gần giống nhau.

---

## Thêm renderer mới?

Nếu bạn muốn hỗ trợ thêm OpenLayers / Mapbox GL / Cesium, hãy:

1. Tạo folder `src/renderers/<name>/` chứa `<Name>Renderer.ts` implement `IRenderer`.
2. Tạo `index.ts` export class.
3. Trong `package.json`, thêm entry `"./<name>"`.
4. Trong `rollup.config.ts`, thêm 2-3 config (ESM, CJS, `.d.ts`).
5. Đưa vào `peerDependencies` nếu cần.
