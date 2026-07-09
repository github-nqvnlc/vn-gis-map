# @vn-gis/map v2.0.0

Thư viện bản đồ GIS Việt Nam - Thư viện nhẹ hỗ trợ hiển thị bản đồ với Leaflet và MapLibre GL JS.

## Tổng quan

`@vn-gis/map` là thư viện JavaScript/TypeScript cung cấp API thống nhất để hiển thị bản đồ tập trung vào Việt Nam, hỗ trợ nhiều engine render bản đồ.

## Tính năng

- **Hỗ trợ 2 Engine**: Tương thích với cả Leaflet và MapLibre GL JS
- **Tập trung Việt Nam**: Cấu hình sẵn bounds, tâm bản đồ, và mức zoom cho Việt Nam
- **Quản lý Layer**: Thêm markers, polygons, và layers GeoJSON tùy chỉnh
- **Hệ thống Events**: Đăng ký các sự kiện bản đồ như click, zoom, di chuyển
- **Hỗ trợ TypeScript**: Đầy đủ type definitions
- **Tree Shakeable**: Các bundle ESM/CJS/UMD để tối ưu kích thước

## Cài đặt

```bash
npm install @vn-gis/map
```

### Peer Dependencies

Bạn cần cài đặt một trong các thư viện bản đồ:

```bash
# Cho Leaflet
npm install leaflet

# Cho MapLibre GL JS
npm install maplibre-gl
```

## Bắt đầu nhanh

### Sử dụng Leaflet

```javascript
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

// Tạo bản đồ
const map = new VNGisMap({
  container: 'map', // hoặc document.getElementById('map')
  renderer: 'leaflet',
  center: VN_CENTER,
  zoom: 6,
  bounds: VN_BOUNDS,
});

// Thêm marker
map.addLayer('hanoi-marker', 'marker', {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Hanoi',
  popup: '<strong>Hanoi</strong><br/>Thủ đô Việt Nam',
});

// Lắng nghe sự kiện
map.on('click', (payload) => {
  console.log('Bản đồ được click tại:', payload.data);
});
```

### Sử dụng MapLibre GL JS

```javascript
import { VNGisMap, VN_CENTER } from '@vn-gis/map';

const map = new VNGisMap({
  container: 'map',
  renderer: 'maplibre',
  center: VN_CENTER,
  zoom: 6,
});
```

## Cấu hình

### MapConfig

| Thuộc tính | Loại | Mặc định | Mô tả |
|------------|------|----------|--------|
| `container` | `string \| HTMLElement` | **bắt buộc** | Phần tử container ID hoặc HTMLElement |
| `renderer` | `'leaflet' \| 'maplibre'` | `'leaflet'` | Engine render bản đồ |
| `center` | `[lat, lng]` | `VN_CENTER` | Tọa độ tâm ban đầu |
| `zoom` | `number` | `6` | Mức zoom ban đầu |
| `minZoom` | `number` | `5` | Mức zoom tối thiểu |
| `maxZoom` | `number` | `18` | Mức zoom tối đa |
| `bounds` | `[[lat, lng], [lat, lng]]` | `VN_BOUNDS` | Giới hạn kéo bản đồ |
| `scrollWheelZoom` | `boolean` | `true` | Bật/tắt zoom bằng con lăn chuột |

## Các loại Layer

### Marker

```javascript
map.addLayer('marker-id', 'marker', {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Tiêu đề Marker',      // Tùy chọn - tooltip
  popup: '<strong>Popup</strong>', // Tùy chọn - nội dung popup
  icon: {                        // Tùy chọn - icon tùy chỉnh
    iconUrl: '/path/to/icon.png',
    iconSize: [32, 32],
  },
});
```

### Polygon

```javascript
map.addLayer('polygon-id', 'polygon', {
  coordinates: [
    [21.0, 105.8],
    [21.1, 105.9],
    [21.0, 105.9],
  ],
  color: '#ff5722',       // Màu viền
  fillColor: '#ff5722',   // Màu nền
  fillOpacity: 0.3,       // Độ mờ nền (0-1)
  weight: 2,              // Độ dày viền
});
```

### GeoJSON

```javascript
const geojsonData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [105.8542, 21.0285],
    },
    properties: { name: 'Hanoi' },
  }],
};

map.addLayer('geojson-id', 'geojson', {
  data: geojsonData,
  style: {
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.2,
    weight: 2,
  },
});
```

## API Reference

### Class VNGisMap

#### Constructor

```typescript
new VNGisMap(config: MapConfig)
```

#### Các phương thức

| Phương thức | Mô tả |
|-------------|--------|
| `addLayer(id, type, options)` | Thêm một layer vào bản đồ |
| `removeLayer(id)` | Xóa một layer theo ID |
| `setView(center, zoom?)` | Đặt tâm bản đồ và mức zoom tùy chọn |
| `fitBounds(bounds)` | Phóng bản đồ để hiển thị bounds |
| `on(event, handler)` | Đăng ký lắng nghe sự kiện bản đồ |
| `off(event, handler)` | Hủy đăng ký sự kiện |
| `once(event, handler)` | Đăng ký sự kiện chỉ chạy một lần |
| `getOptions()` | Lấy các tùy chọn bản đồ hiện tại |
| `getRendererType()` | Lấy loại renderer ('leaflet' hoặc 'maplibre') |
| `destroy()` | Dọn dẹp và hủy bản đồ |

#### Các sự kiện

| Sự kiện | Mô tả |
|---------|--------|
| `ready` | Bản đồ đã sẵn sàng |
| `click` | Click vào bản đồ |
| `dblclick` | Double click vào bản đồ |
| `zoomstart` | Bắt đầu zoom |
| `zoomend` | Kết thúc zoom |
| `movestart` | Bắt đầu di chuyển |
| `moveend` | Kết thúc di chuyển |
| `layeradd` | Layer được thêm |
| `layerremove` | Layer được xóa |

## Các hằng số

```typescript
import {
  VN_CENTER,        // [14.0583, 108.2772] - Tâm Việt Nam
  VN_BOUNDS,        // [[8.18, 102.14], [23.24, 109.47]] - Giới hạn Việt Nam
  VN_DEFAULT_ZOOM,  // 6 - Zoom mặc định xem toàn Việt Nam
  VN_MIN_ZOOM,      // 5 - Mức zoom tối thiểu
  VN_MAX_ZOOM,      // 18 - Mức zoom tối đa
  VN_CITY_ZOOM,     // 12 - Zoom xem thành phố
  VN_DISTRICT_ZOOM, // 14 - Zoom xem quận/huyện
  VN_STREET_ZOOM,   // 16 - Zoom xem đường/phố
} from '@vn-gis/map';
```

## Sử dụng trên Browser

Để sử dụng trên browser không có bundler:

```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<!-- VNGisMap -->
<script type="module">
  import { VNGisMap } from './dist/index.umd.js';

  const map = new VNGisMap({
    container: 'map',
    renderer: 'leaflet',
  });
</script>
```

## TypeScript

Thư viện viết bằng TypeScript và cung cấp đầy đủ type definitions:

```typescript
import type {
  MapConfig,
  MarkerOptions,
  PolygonOptions,
  GeoJSONOptions,
  LatLng,
  BoundsTuple,
} from '@vn-gis/map';
```

## License

MIT License
