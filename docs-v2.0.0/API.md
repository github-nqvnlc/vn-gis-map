# Tài liệu API - @vn-gis/map v2.0.0

## Mục lục

1. [Class VNGisMap](#vngismap-class)
2. [Class EventEmitter](#eventemitter-class)
3. [Các kiểu dữ liệu](#các-kiểu-dữ-liệu)
4. [Các hằng số](#các-hằng-số)

---

## VNGisMap Class

Class chính để tạo và quản lý bản đồ.

### Constructor

```typescript
new VNGisMap(config: MapConfig)
```

Tạo một instance bản đồ mới.

**Tham số:**

| Tên | Loại | Bắt buộc | Mô tả |
|------|------|----------|--------|
| `config` | `MapConfig` | Có | Các tùy chọn cấu hình |

**Ví dụ:**

```typescript
const map = new VNGisMap({
  container: 'map-container',
  renderer: 'leaflet',
  center: [21.0285, 105.8542],
  zoom: 12,
});
```

---

### Các phương thức

#### `addLayer(id, type, options)`

Thêm một layer vào bản đồ.

```typescript
addLayer(id: string, type: LayerType, options: LayerOptions): void
```

**Tham số:**

| Tên | Loại | Mô tả |
|------|------|--------|
| `id` | `string` | Định danh duy nhất cho layer |
| `type` | `'marker' \| 'polygon' \| 'geojson'` | Loại layer |
| `options` | `MarkerOptions \| PolygonOptions \| GeoJSONOptions` | Cấu hình layer |

**Ví dụ:**

```typescript
// Thêm marker
map.addLayer('hanoi', 'marker', {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Hanoi',
});

// Thêm polygon
map.addLayer('zone-1', 'polygon', {
  coordinates: [[21.0, 105.8], [21.1, 105.9], [21.0, 105.9]],
  color: '#ff5722',
  fillOpacity: 0.3,
});

// Thêm GeoJSON
map.addLayer('boundary', 'geojson', {
  data: geojsonFeatureCollection,
  style: { color: '#3388ff', fillOpacity: 0.2 },
});
```

---

#### `removeLayer(id)`

Xóa một layer khỏi bản đồ.

```typescript
removeLayer(id: string): void
```

**Tham số:**

| Tên | Loại | Mô tả |
|------|------|--------|
| `id` | `string` | Định danh layer cần xóa |

**Ví dụ:**

```typescript
map.removeLayer('hanoi');
```

---

#### `setView(center, zoom?)`

Đặt tâm bản đồ và mức zoom tùy chọn.

```typescript
setView(center: LatLng, zoom?: number): void
```

**Tham số:**

| Tên | Loại | Mô tả |
|------|------|--------|
| `center` | `[number, number]` | Tọa độ tâm `[lat, lng]` |
| `zoom` | `number` | Mức zoom tùy chọn |

**Ví dụ:**

```typescript
map.setView([21.0285, 105.8542], 14);
map.setView([21.0285, 105.8542]); // Giữ nguyên zoom hiện tại
```

---

#### `fitBounds(bounds)`

Phóng bản đồ để hiển thị một vùng giới hạn.

```typescript
fitBounds(bounds: BoundsTuple): void
```

**Tham số:**

| Tên | Loại | Mô tả |
|------|------|--------|
| `bounds` | `[[number, number], [number, number]]` | `[[nam, đông], [bắc, tây]]` |

**Ví dụ:**

```typescript
map.fitBounds([
  [21.0, 105.8],
  [21.1, 105.9],
]);
```

---

#### `on(event, handler)`

Đăng ký lắng nghe sự kiện bản đồ.

```typescript
on(event: string, handler: EventHandler): this
```

**Tham số:**

| Tên | Loại | Mô tả |
|------|------|--------|
| `event` | `string` | Tên sự kiện |
| `handler` | `Function` | Hàm xử lý sự kiện |

**Ví dụ:**

```typescript
map.on('click', (payload) => {
  console.log('Click tại:', payload.data.lat, payload.data.lng);
});

map.on('zoomend', () => {
  console.log('Zoom kết thúc');
});
```

---

#### `off(event, handler)`

Hủy đăng ký lắng nghe sự kiện.

```typescript
off(event: string, handler: EventHandler): this
```

**Ví dụ:**

```typescript
const handler = (payload) => { /* ... */ };
map.on('click', handler);
// Sau đó...
map.off('click', handler);
```

---

#### `once(event, handler)`

Đăng ký sự kiện chỉ chạy một lần.

```typescript
once(event: string, handler: EventHandler): this
```

**Ví dụ:**

```typescript
map.once('ready', () => {
  console.log('Bản đồ đã sẵn sàng - sự kiện này chỉ chạy một lần');
});
```

---

#### `getOptions()`

Lấy các tùy chọn bản đồ hiện tại.

```typescript
getOptions(): MapOptions | null
```

**Trả về:** Đối tượng `MapOptions` hoặc `null` nếu chưa khởi tạo

---

#### `getRendererType()`

Lấy loại renderer đang sử dụng.

```typescript
getRendererType(): string | null
```

**Trả về:** `'leaflet'`, `'maplibre'`, hoặc `null`

---

#### `destroy()`

Dọn dẹp và hủy instance bản đồ.

```typescript
destroy(): void
```

**Ví dụ:**

```typescript
map.destroy();
```

---

## EventEmitter Class

Class cơ sở cho việc xử lý sự kiện.

### Các phương thức

| Phương thức | Mô tả |
|-------------|--------|
| `on(event, handler)` | Đăng ký lắng nghe sự kiện |
| `off(event, handler)` | Hủy đăng ký sự kiện |
| `once(event, handler)` | Đăng ký một lần |
| `emit(event, data?)` | Phát sự kiện |
| `removeAllListeners(event?)` | Xóa tất cả listeners |

---

## Các kiểu dữ liệu

### MapConfig

```typescript
interface MapConfig {
  container: string | HTMLElement;
  renderer?: 'leaflet' | 'maplibre';
  center?: LatLng;
  zoom?: number;
  maxZoom?: number;
  minZoom?: number;
  bounds?: BoundsTuple;
  scrollWheelZoom?: boolean;
}
```

### MapOptions

```typescript
interface MapOptions {
  container: HTMLElement;
  renderer: RendererType;
  center: LatLng;
  zoom: number;
  maxZoom: number;
  minZoom: number;
  bounds?: BoundsTuple;
  scrollWheelZoom: boolean;
}
```

### MarkerOptions

```typescript
interface MarkerOptions {
  lat: number;
  lng: number;
  title?: string;
  popup?: string;
  icon?: LeafletIconOptions | MapLibreIconOptions;
}
```

### PolygonOptions

```typescript
interface PolygonOptions {
  coordinates: [number, number][];
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  opacity?: number;
}
```

### GeoJSONOptions

```typescript
interface GeoJSONOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature;
  style?: GeoJSONStyle;
}
```

### GeoJSONStyle

```typescript
interface GeoJSONStyle {
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  weight?: number;
  opacity?: number;
}
```

### MapEventPayload

```typescript
interface MapEventPayload<T = unknown> {
  type: MapEvent;
  timestamp: number;
  data?: T;
}
```

### MapEvent

```typescript
type MapEvent =
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'mouseover'
  | 'mouseout'
  | 'mousemove'
  | 'contextmenu'
  | 'zoomstart'
  | 'zoomend'
  | 'zoomlevelschange'
  | 'movestart'
  | 'move'
  | 'moveend'
  | 'dragstart'
  | 'drag'
  | 'dragend'
  | 'resize'
  | 'layeradd'
  | 'layerremove'
  | 'ready'
  | 'error';
```

---

## Các hằng số

| Hằng số | Giá trị | Mô tả |
|---------|---------|--------|
| `VN_BOUNDS` | `[[8.18, 102.14], [23.24, 109.47]]` | Giới hạn địa lý Việt Nam |
| `VN_CENTER` | `[14.0583, 108.2772]` | Tâm Việt Nam |
| `VN_DEFAULT_ZOOM` | `6` | Zoom mặc định xem toàn Việt Nam |
| `VN_MIN_ZOOM` | `5` | Mức zoom tối thiểu |
| `VN_MAX_ZOOM` | `18` | Mức zoom tối đa |
| `VN_CITY_ZOOM` | `12` | Zoom xem thành phố |
| `VN_DISTRICT_ZOOM` | `14` | Zoom xem quận/huyện |
| `VN_STREET_ZOOM` | `16` | Zoom xem đường/phố |

---

## Sub-path Exports

Thư viện cung cấp các sub-path exports:

```typescript
// Package chính
import { VNGisMap } from '@vn-gis/map';

// Leaflet renderer
import { LeafletRenderer } from '@vn-gis/map/leaflet';

// MapLibre renderer
import { MapLibreRenderer } from '@vn-gis/map/maplibre';
```
