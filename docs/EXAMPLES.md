# Phân tích `examples/` — Demo chạy trực tiếp trên browser

Thư mục `examples/` chứa các file HTML chạy độc lập, **không cần bundler**, dùng để kiểm thử trực quan và smoke-test sau khi build. Cả 2 file đều import từ `dist/` (ESM local).

---

## Cấu trúc chung

Mỗi example là một trang HTML tự chứa:

1. `<link>` tới CSS của renderer (peer dep — load từ unpkg).
2. `<script>` tới JS của renderer (UMD — set global `window.L` hoặc `window.maplibregl`).
3. `<script type="module">` import `VNGisMap` và renderer adapter từ `../dist/`.
4. UI sidebar điều khiển + vùng `#map` hiển thị.
5. Một số event handler minh hoạ.

### Cú pháp import local

```ts
import { VNGisMap } from '../dist/index.esm.js';
import { LeafletRenderer } from '../dist/renderers/leaflet.esm.js';
```

Đường dẫn tương đối chỉ tới `dist/` sau khi chạy `npm run build`. Đây là cách tiện nhất để kiểm thử ngay sau khi build mà không cần dev-server.

---

## `examples/leaflet.html` — Demo với Leaflet

**211 dòng.**

### HTML/CSS

- Sidebar 300px bên trái (nền xám nhạt `#f7f8fa`), bản đồ chiếm phần còn lại (`flex: 1`).
- Style button: primary xanh dương `#4a90d9`, secondary xám.
- Font hệ thống (system-ui).

### Nhúng Leaflet qua CDN

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" ...>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" ...></script>
```

Điều này tạo global `window.L`, mà không cần bundler. Tuy nhiên trong code chính `LeafletRenderer` vẫn nhận qua `new LeafletRenderer(L)` từ import ES — nhưng fallback dùng `window.L`.

### UI điều khiển

```html
<div class="control-group">
  <label>Tỉnh / Thành</label>
  <button id="btn-provinces">Hiện tỉnh/thành</button>
  <button id="btn-hide-provinces" class="secondary">Ẩn</button>
</div>

<div class="control-group">
  <label>Xã / Phường theo tỉnh</label>
  <select id="province-select">
    <option value="01">Hà Nội (01)</option>
    <option value="79">TP. Hồ Chí Minh (79)</option>
    <option value="48">Đà Nẵng (48)</option>
    <option value="31">Hải Phòng (31)</option>
    <option value="92">Cần Thơ (92)</option>
  </select>
  <button id="btn-wards">Hiện xã/phường</button>
</div>

<div id="info">...</div>
```

5 thành phố lớn làm option mặc định để demo nhanh.

### Script chính

```ts
const API_BASE_URL = 'http://localhost:4000';
const API_TOKEN = 'eyJhbG...'; // JWT thật, chỉ dùng local dev

const map = new VNGisMap(
  {
    container: 'map',
    renderer: 'leaflet',
    apiBaseUrl: API_BASE_URL,
    token: API_TOKEN,
    layers: { provinces: true },
    onProvinceClick: (feature) => {
      infoEl.innerHTML = `<strong>${p.name ?? p.code}</strong><br/>Mã tỉnh: ${p.code}`;
    },
    onWardClick: (feature) => {
      infoEl.innerHTML = `<strong>${p.name ?? p.code}</strong><br/>Mã xã: ${p.code}`;
    },
  },
  () => new LeafletRenderer(window.L),
);

map.on('ready', () => console.log('Map sẵn sàng'));

map.on('click', async (payload) => {
  if (!payload.lngLat) return;
  const [lng, lat] = payload.lngLat;
  infoEl.textContent = 'Đang tra cứu...';
  try {
    const result = await map.reverseGeocode(lng, lat);
    if (result.found && result.ward) {
      infoEl.innerHTML = `<strong>${result.ward.ward_full_name}</strong>...`;
    } else {
      infoEl.innerHTML = `Không tìm thấy khu vực tại ...`;
    }
  } catch (err) {
    infoEl.textContent = 'Lỗi tra cứu: ' + err.message;
  }
});

document.getElementById('btn-provinces').onclick = () => map.showProvinces();
document.getElementById('btn-hide-provinces').onclick = () => map.hideProvinces();
document.getElementById('btn-wards').onclick = () => {
  const code = document.getElementById('province-select').value;
  map.showWards(code);
};
```

### Demo các API

| Hành động người dùng | API được gọi |
|---|---|
| Click nút "Hiện tỉnh/thành" | `map.showProvinces()` (không tham số) |
| Click "Ẩn" | `map.hideProvinces()` |
| Chọn tỉnh + click "Hiện xã/phường" | `map.showWards(code)` |
| Click trên bản đồ | `map.on('click', ...)` → lấy `lngLat` → `map.reverseGeocode(lng, lat)` |
| Click vào polygon tỉnh/xã | `onProvinceClick` / `onWardClick` callback |

### Điều kiện chạy

1. `npm run build` đã chạy → có `dist/index.esm.js`, `dist/renderers/leaflet.esm.js`.
2. Backend `vn-gis-api` chạy ở `http://localhost:4000` (hoặc đổi `API_BASE_URL`).
3. Mở file qua một HTTP server (ví dụ `python -m http.server` ở thư mục gốc) hoặc dùng VS Code Live Server.

> ⚠️ **CORS**: Nếu frontend chạy ở `file://` và backend ở `localhost:4000`, fetch sẽ fail do CORS. Hãy serve HTML qua HTTP server.

### Vì sao token trong source code?

Đây là JWT demo với expiry ngắn, dùng để test local. Trong thực tế KHÔNG nên nhúng token thật vào HTML.

---

## `examples/maplibre.html` — Demo với MapLibre GL JS

**191 dòng.**

### Điểm khác so với Leaflet

- Load `maplibre-gl@5.5.0` từ unpkg, tạo `window.maplibregl`.
- Render toàn bộ qua WebGL thay vì DOM (Leaflet).
- API người dùng giống hệt — chỉ thay `renderer: 'maplibre'` và `MapLibreRenderer(window.maplibregl)`.

### UI giống hệt `leaflet.html`

Sidebar + select tỉnh + button + info panel — copy nguyên.

### Script khác biệt chính

```ts
import { MapLibreRenderer } from '../dist/renderers/maplibre.esm.js';
// ...
() => new MapLibreRenderer(window.maplibregl)
```

Phần còn lại (event handler, button onclick) y hệt `leaflet.html` — đây là minh chứng cho thiết kế **renderer-agnostic**: cùng `VNGisMap` API, chỉ khác renderer adapter.

---

## Cách chạy example

```bash
# 1. Build trước
npm run build

# 2. Từ thư mục gốc package, khởi động static server
npx http-server -p 8080

# 3. Mở trình duyệt
# http://localhost:8080/examples/leaflet.html
# http://localhost:8080/examples/maplibre.html
```

Hoặc dùng VS Code extension **Live Server**:

1. Mở folder trong VS Code.
2. Click chuột phải `examples/leaflet.html` → **Open with Live Server**.

---

## Thêm example mới?

Bạn có thể thêm example cho OpenLayers/Cesium bằng cách:

1. Tạo `examples/openlayers.html`.
2. Load OL qua CDN.
3. Import `VNGisMap` từ `dist/index.esm.js`.
4. Truyền custom renderer vào factory.

> Lưu ý hiện tại chỉ có Leaflet & MapLibre renderer đi kèm. Nếu muốn OpenLayers, cần viết thêm `OpenLayersRenderer implements IRenderer` trong `src/renderers/openlayers/`.

---

## So sánh 2 example

| Tính năng | Leaflet | MapLibre |
|---|---|---|
| Loading | DOM tiles | WebGL raster |
| Style default | OK (giống nhau) | OK (giống nhau) |
| Click → reverse geocode | OK | OK |
| Click on feature → callback | OK | OK |
| Chuyển tỉnh → đổi wards | OK | OK |
| Hiệu năng | Trung bình | Cao hơn với dataset lớn |

Khác biệt UX giữa 2 renderer là tối thiểu — `MapLibreRenderer` có chỉnh `zoom - 1` để bù chênh lệch thang zoom.
