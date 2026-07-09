# Ví dụ sử dụng - @vn-gis/map v2.0.0

## Sử dụng cơ bản

### Tạo bản đồ đơn giản

```javascript
import { VNGisMap, VN_CENTER } from '@vn-gis/map';

const map = new VNGisMap({
  container: 'map',
  center: VN_CENTER,
  zoom: 6,
});
```

### Sử dụng MapLibre GL JS

```javascript
import { VNGisMap, VN_CENTER } from '@vn-gis/map';

const map = new VNGisMap({
  container: 'map',
  renderer: 'maplibre', // Sử dụng MapLibre GL JS
  center: VN_CENTER,
  zoom: 6,
});
```

---

## Markers

### Marker đơn giản

```javascript
map.addLayer('marker-1', 'marker', {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Hanoi',
});
```

### Marker có Popup

```javascript
map.addLayer('marker-2', 'marker', {
  lat: 10.8231,
  lng: 106.6297,
  title: 'Ho Chi Minh City',
  popup: `
    <strong>Ho Chi Minh City</strong>
    <p>Thành phố lớn nhất Việt Nam</p>
  `,
});
```

### Marker với Icon tùy chỉnh

```javascript
map.addLayer('custom-marker', 'marker', {
  lat: 21.0285,
  lng: 105.8542,
  title: 'Icon tùy chỉnh',
  icon: {
    iconUrl: '/images/custom-marker.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  },
});
```

### Nhiều Markers

```javascript
const locations = [
  { id: 'hanoi', lat: 21.0285, lng: 105.8542, name: 'Hanoi' },
  { id: 'hcmc', lat: 10.8231, lng: 106.6297, name: 'Ho Chi Minh City' },
  { id: 'danang', lat: 16.0544, lng: 108.2022, name: 'Da Nang' },
  { id: 'haiphong', lat: 20.8449, lng: 106.6881, name: 'Hai Phong' },
];

locations.forEach(({ id, lat, lng, name }) => {
  map.addLayer(id, 'marker', {
    lat,
    lng,
    title: name,
    popup: `<strong>${name}</strong>`,
  });
});
```

---

## Polygons

### Polygon đơn giản

```javascript
map.addLayer('triangle', 'polygon', {
  coordinates: [
    [21.0, 105.8],
    [21.1, 105.9],
    [21.0, 105.9],
  ],
});
```

### Polygon có kiểu style

```javascript
map.addLayer('zone-a', 'polygon', {
  coordinates: [
    [21.0285, 105.8542],
    [21.0385, 105.8642],
    [21.0285, 105.8742],
    [21.0185, 105.8642],
  ],
  color: '#ff5722',       // Màu viền
  fillColor: '#ff5722',   // Màu nền
  fillOpacity: 0.3,       // 30% độ mờ
  weight: 3,              // Viền dày 3px
});
```

### Nhiều Polygons

```javascript
const zones = [
  { id: 'zone-north', coordinates: [[21.1, 105.8], [21.2, 105.9], [21.1, 106.0]], color: '#e91e63' },
  { id: 'zone-south', coordinates: [[21.0, 105.7], [21.1, 105.8], [21.0, 105.9]], color: '#2196f3' },
  { id: 'zone-east', coordinates: [[21.0, 105.9], [21.1, 106.0], [21.0, 106.1]], color: '#4caf50' },
];

zones.forEach(({ id, coordinates, color }) => {
  map.addLayer(id, 'polygon', {
    coordinates,
    color,
    fillColor: color,
    fillOpacity: 0.3,
    weight: 2,
  });
});
```

---

## GeoJSON

### GeoJSON Point đơn giản

```javascript
const pointData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [105.8542, 21.0285],
      },
      properties: { name: 'Hanoi' },
    },
  ],
};

map.addLayer('hanoi-point', 'geojson', { data: pointData });
```

### GeoJSON Polygon

```javascript
const districtData = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [105.8, 21.0],
          [105.9, 21.0],
          [105.9, 21.1],
          [105.8, 21.1],
          [105.8, 21.0],
        ]],
      },
      properties: { name: 'Quận A', population: 150000 },
    },
  ],
};

map.addLayer('district', 'geojson', {
  data: districtData,
  style: {
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.3,
    weight: 2,
  },
});
```

### Tải GeoJSON từ bên ngoài

```javascript
fetch('/data/vietnam-provinces.geojson')
  .then((response) => response.json())
  .then((data) => {
    map.addLayer('provinces', 'geojson', {
      data,
      style: {
        color: '#666',
        fillColor: '#ccc',
        fillOpacity: 0.2,
        weight: 1,
      },
    });
  })
  .catch((error) => {
    console.error('Lỗi tải GeoJSON:', error);
  });
```

---

## Sự kiện

### Sự kiện Click

```javascript
map.on('click', (payload) => {
  const { lat, lng } = payload.data;
  console.log(`Bản đồ click tại ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  
  // Hiển thị thông tin
  infoElement.textContent = `Vị trí: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
});
```

### Sự kiện Zoom

```javascript
map.on('zoomstart', () => {
  console.log('Bắt đầu zoom');
});

map.on('zoomend', (payload) => {
  console.log('Kết thúc zoom');
  console.log('Zoom hiện tại:', payload.data.target.getZoom());
});
```

### Sự kiện Layer

```javascript
map.on('layeradd', (payload) => {
  console.log(`Layer được thêm: ${payload.data.id}`);
});

map.on('layerremove', (payload) => {
  console.log(`Layer được xóa: ${payload.data.id}`);
});
```

### Sự kiện Ready

```javascript
map.once('ready', () => {
  console.log('Bản đồ đã sẵn sàng!');
  
  // Thêm các layer ban đầu sau khi bản đồ sẵn sàng
  map.addLayer('start-marker', 'marker', {
    lat: 21.0285,
    lng: 105.8542,
    title: 'Điểm bắt đầu',
  });
});
```

---

## Điều hướng

### Đặt View

```javascript
// Đến Hà Nội
map.setView([21.0285, 105.8542], 12);

// Đến TP Hồ Chí Minh
map.setView([10.8231, 106.6297], 12);

// Zoom in/out trong khi giữ nguyên tâm
map.setView(currentCenter, currentZoom + 1);
```

### Fit vào Bounds

```javascript
// Fit vào Việt Nam
map.fitBounds(VN_BOUNDS);

// Fit vào một vùng cụ thể
map.fitBounds([
  [21.0, 105.8],
  [21.1, 105.9],
]);
```

### Các vị trí định sẵn

```javascript
const locations = {
  hanoi: { center: [21.0285, 105.8542], zoom: 12 },
  hcmc: { center: [10.8231, 106.6297], zoom: 12 },
  danang: { center: [16.0544, 108.2022], zoom: 12 },
  vietnam: { center: [14.0583, 108.2772], zoom: 6 },
};

function goTo(location) {
  const { center, zoom } = locations[location];
  map.setView(center, zoom);
}

goTo('hanoi');
```

---

## Quản lý Layer

### Xóa Layer

```javascript
map.removeLayer('marker-1');
map.removeLayer('polygon-1');
map.removeLayer('geojson-1');
```

### Xóa tất cả Layers

```javascript
const layerIds = ['marker-1', 'marker-2', 'polygon-1', 'geojson-1'];

function clearAllLayers() {
  layerIds.forEach((id) => map.removeLayer(id));
  layerIds = [];
}

clearAllLayers();
```

### Bật/Tắt Layer Visibility

```javascript
const visibleLayers = new Set(['marker-1', 'polygon-1']);

function toggleLayer(id) {
  if (visibleLayers.has(id)) {
    map.removeLayer(id);
    visibleLayers.delete(id);
  } else {
    // Thêm lại layer với options gốc
    visibleLayers.add(id);
  }
}
```

---

## Ví dụ hoàn chỉnh

```javascript
import { VNGisMap, VN_CENTER, VN_BOUNDS } from '@vn-gis/map';

// Khởi tạo bản đồ
const map = new VNGisMap({
  container: 'map',
  renderer: 'leaflet',
  center: VN_CENTER,
  zoom: 6,
  bounds: VN_BOUNDS,
  scrollWheelZoom: true,
});

// Theo dõi layers
const layers = [];

// Bản đồ sẵn sàng
map.once('ready', () => {
  console.log('Bản đồ đã sẵn sàng!');
  
  // Thêm một số markers
  map.addLayer('hanoi', 'marker', {
    lat: 21.0285,
    lng: 105.8542,
    title: 'Hanoi',
    popup: '<strong>Hanoi</strong><br/>Thủ đô Việt Nam',
  });
  layers.push('hanoi');

  map.addLayer('hcmc', 'marker', {
    lat: 10.8231,
    lng: 106.6297,
    title: 'Ho Chi Minh City',
    popup: '<strong>TP HCM</strong><br/>Thành phố lớn nhất',
  });
  layers.push('hcmc');
});

// Sự kiện
map.on('click', (payload) => {
  console.log(`Click: ${payload.data.lat}, ${payload.data.lng}`);
});

map.on('layeradd', (payload) => {
  console.log(`Layer thêm: ${payload.data.id}`);
});

// Dọn dẹp khi unload trang
window.addEventListener('beforeunload', () => {
  map.destroy();
});
```

---

## Template HTML

Để test nhanh, sử dụng template này:

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demo VN GIS Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    #map { height: 100vh; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script type="module">
    import { VNGisMap, VN_CENTER } from '../dist/index.esm.js';
    
    const map = new VNGisMap({
      container: 'map',
      center: VN_CENTER,
      zoom: 6,
    });
    
    map.addLayer('marker-1', 'marker', {
      lat: 21.0285,
      lng: 105.8542,
      title: 'Hanoi',
    });
  </script>
</body>
</html>
```
