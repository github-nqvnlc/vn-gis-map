# Hướng dẫn kiểm thử trước khi Release

Tài liệu này mô tả toàn bộ các bước kiểm thử cần chạy để chắc chắn `@vn-gis/map` sẵn sàng phát hành. Chạy hết checklist này trước khi làm theo [RELEASE.md](./RELEASE.md).

---

## 1. Chuẩn bị môi trường

Yêu cầu:

- Node.js **>= 18** (CI test trên 18, 20, 22).
- npm (đi kèm Node) hoặc trình quản lý tương thích.

Cài dependencies từ lockfile để đảm bảo tái lập chính xác môi trường CI:

```bash
npm ci
```

> Dùng `npm ci` thay vì `npm install` khi kiểm thử tiền-release: nó cài đúng theo `package-lock.json`, phát hiện lệch lockfile, và giống hệt môi trường CI.

---

## 2. Chạy toàn bộ pipeline kiểm thử

Chạy tuần tự đúng thứ tự CI. Nếu bước nào đỏ, dừng lại và sửa trước khi tiếp tục.

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src tests
npm run format:check   # prettier --check
npm run test           # vitest run
npm run build          # rollup build ESM/CJS/UMD + .d.ts
```

Hoặc gộp một dòng:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

### Ý nghĩa từng bước

| Lệnh | Mục đích | Khi đỏ thì |
| --- | --- | --- |
| `typecheck` | Bắt lỗi kiểu TypeScript trên toàn source | Sửa lỗi type, không dùng `any` để né |
| `lint` | Quy tắc code + tích hợp Prettier | Chạy `npm run lint:fix` |
| `format:check` | Định dạng nhất quán | Chạy `npm run format` |
| `test` | Unit test (Vitest) | Sửa code hoặc cập nhật test |
| `build` | Đảm bảo bundle & type declaration tạo được | Xem log Rollup, sửa cấu hình/import |

---

## 3. Kiểm thử với coverage

```bash
npm run test:coverage
```

- Báo cáo text in ra terminal; báo cáo HTML nằm ở `coverage/index.html`.
- Xem file nào coverage thấp và cân nhắc bổ sung test cho core (`ApiClient`, `LayerManager`, `EventEmitter`, `utils`).

Mở báo cáo HTML:

```bash
# macOS
open coverage/index.html
# Windows
start coverage/index.html
# Linux
xdg-open coverage/index.html
```

---

## 4. Chế độ watch khi phát triển

Khi đang sửa và muốn test chạy lại tự động:

```bash
npm run test:watch     # Vitest watch
npm run build:watch    # Rollup watch
```

---

## 5. Kiểm tra nội dung package sẽ publish

Rất quan trọng: xác nhận đúng file được đóng gói, không lọt file thừa (source, test, config).

```bash
npm pack --dry-run
```

Kiểm tra output:

- [ ] Có `dist/index.esm.js`, `dist/index.cjs.js`, `dist/index.umd.js`.
- [ ] Có `dist/index.d.ts`.
- [ ] Có `dist/renderers/leaflet.*` và `dist/renderers/maplibre.*` (gồm cả `.d.ts`).
- [ ] Có `README.md`, `CHANGELOG.md`, `LICENSE`.
- [ ] **Không** có `src/`, `tests/`, `node_modules/`, file config.

> Danh sách file được điều khiển bởi trường `files` trong `package.json`. Nếu thấy thiếu/thừa, chỉnh `files`.

Tạo tarball thật để soi kỹ (tuỳ chọn):

```bash
npm pack
tar -tf vn-gis-map-*.tgz
rm vn-gis-map-*.tgz
```

---

## 6. Kiểm thử tích hợp cục bộ (smoke test)

Xác nhận package hoạt động thật khi được cài vào một project khác, trước khi publish.

### Cách A — `npm pack` + cài từ tarball (khuyến nghị)

```bash
# tại thư mục package
npm run build
npm pack                      # tạo vn-gis-map-<version>.tgz

# tại một project thử nghiệm riêng
mkdir /tmp/test-vn-gis && cd /tmp/test-vn-gis
npm init -y
npm install /đường/dẫn/tới/vn-gis-map-<version>.tgz leaflet
```

Tạo file thử `index.mjs`:

```js
import { VNGisMap, VN_BOUNDS } from '@vn-gis/map';
console.log('Bounds VN:', VN_BOUNDS);
console.log('VNGisMap loaded:', typeof VNGisMap);
```

```bash
node index.mjs
```

Kỳ vọng: in ra bounds và `VNGisMap loaded: function`.

### Cách B — `npm link`

```bash
# tại thư mục package
npm run build
npm link

# tại project thử
npm link @vn-gis/map
```

> Nhớ `npm unlink` sau khi test xong để tránh nhầm lẫn.

### Kiểm tra resolve type & entrypoint

Trong project thử, kiểm tra cả 3 entrypoint resolve đúng:

```ts
import { VNGisMap } from '@vn-gis/map';
import { LeafletRenderer } from '@vn-gis/map/leaflet';
import { MapLibreRenderer } from '@vn-gis/map/maplibre';
```

TypeScript không được báo lỗi resolve; autocomplete hiển thị đúng type.

---

## 7. Kiểm thử trên Next.js (hoặc framework SSR)

Leaflet và MapLibre phụ thuộc `window`/`document`, nên cần tránh server-side rendering.

### Bước 1 — Tạo project Next.js test

```bash
npx create-next-app@latest test-vn-gis-nextjs
cd test-vn-gis-nextjs
```

Chọn TypeScript, App Router (khuyến nghị), Tailwind (tuỳ chọn).

### Bước 2 — Cài package từ tarball

Tại thư mục package chính, build và tạo tarball:

```bash
cd /path/to/vn-gis-map-package
npm run build
npm pack
```

Sao chép file `.tgz` vào project Next.js và cài:

```bash
cd test-vn-gis-nextjs
npm install ../vn-gis-map-package/vn-gis-map-0.1.0.tgz leaflet
npm install --save-dev @types/leaflet
```

### Bước 3 — Tạo Map component (Client Component)

Tạo `components/VNMap.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { VNGisMap as VNGisMapType } from '@vn-gis/map';

export default function VNMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<VNGisMapType | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import để tránh SSR
    Promise.all([
      import('@vn-gis/map'),
      import('@vn-gis/map/leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([{ VNGisMap }, { LeafletRenderer }, L]) => {
      mapRef.current = new VNGisMap(
        {
          container: containerRef.current!,
          renderer: 'leaflet',
          apiBaseUrl: 'https://api.example.com',
          token: 'YOUR_TOKEN',
          layers: { provinces: true },
          onProvinceClick: (f) => {
            console.log('Clicked:', f.properties?.name);
          },
        },
        () => new LeafletRenderer(L),
      );
    });

    return () => {
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="w-full h-screen" />;
}
```

### Bước 4 — Sử dụng trong page

Tạo `app/map/page.tsx`:

```tsx
import dynamic from 'next/dynamic';

const VNMap = dynamic(() => import('@/components/VNMap'), {
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-200">Loading map...</div>,
});

export default function MapPage() {
  return (
    <main>
      <h1 className="text-2xl p-4">VN GIS Map Test</h1>
      <VNMap />
    </main>
  );
}
```

### Bước 5 — Chạy dev server và kiểm tra

```bash
npm run dev
```

Mở http://localhost:3000/map và kiểm tra:

- [ ] Bản đồ render (không lỗi hydration)
- [ ] Tỉnh/thành hiển thị
- [ ] Click vào tỉnh → console log đúng
- [ ] Không có warning SSR trong terminal
- [ ] Hot reload hoạt động

### Bước 6 — Build production

```bash
npm run build
npm start
```

Kiểm tra lại trên http://localhost:3000/map để đảm bảo production build không bị lỗi.

### Lưu ý khi dùng với SSR

- **Luôn dùng `'use client'`** và `dynamic(..., { ssr: false })` cho component chứa map.
- **Import CSS trong `useEffect`** hoặc component client để tránh SSR xử lý stylesheet.
- **MapLibre** cũng cần xử lý tương tự (thay `@vn-gis/map/leaflet` → `@vn-gis/map/maplibre`).
- Nếu dùng Pages Router, wrap component map trong `dynamic(() => import(...), { ssr: false })`.

---

## 8. Kiểm thử thủ công trên trình duyệt (examples)

Package có sẵn ví dụ trong `examples/`:

```bash
npm run build

# phục vụ static bằng server bất kỳ
npx serve .
# hoặc
python -m http.server 8080
```

Mở trong trình duyệt và kiểm tra bằng mắt:

- [ ] `examples/leaflet.html` — bản đồ hiển thị, tỉnh/phường render, click/hover hoạt động.
- [ ] `examples/maplibre.html` — tương tự với renderer MapLibre.
- [ ] Console trình duyệt không có lỗi.

> Các ví dụ cần API vn-gis. Cập nhật `apiBaseUrl`/`token` trong file HTML nếu cần trỏ tới API thật.

---

## 9. Auth — đăng nhập và kiểm tra credentials

Có 2 cách khởi tạo `ApiClient`:

### Cách 1: Cung cấp token trực tiếp

```ts
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  token: 'YOUR_TOKEN',
});
```

### Cách 2: Cung cấp username + password

Nếu không có token, cung cấp `username` + `password`. ApiClient tự động gọi `POST /v1/auth/login` để lấy JWT khi gọi API đầu tiên:

```ts
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  username: 'user@example.com',
  password: 'your-password',
});

// Lần gọi API đầu tiên → tự động login → lấy token
// Các lần sau → dùng lại token đã cache
const provinces = await client.getProvinces();
```

**Ưu điểm**: không cần lưu token trong code/config, chỉ cần user/password.

### Kiểm tra credentials trước khi khởi tạo VNGisMap

```ts
const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  username: 'user@example.com',
  password: 'your-password',
});

const result = await client.validate();
if (!result.valid) {
  alert(`Lỗi: ${result.reason}`);
  return;
}

const map = new VNGisMap(config, () => new LeafletRenderer(L));
```

### Kiểm tra credentials từ form đăng nhập

```ts
async function onLogin({ baseUrl, username, password }: Credentials) {
  const client = new ApiClient({ baseUrl, username, password });
  const result = await client.validate();
  if (!result.valid) {
    setError(result.reason);
    return;
  }
  saveSession({ baseUrl, token: client.getToken?.() ?? '' });
  initMap();
}
```

### Gọi login thủ công

```ts
const result = await client.login('https://api.example.com', 'user@example.com', 'password');
// result.accessToken — JWT string
// result.user         — { id, email, role }
// result.expiresIn    — vd: '7d'
```

### Kết quả trả về

**ValidateResult:**

| Trường | Mô tả |
|---|---|
| `valid` | `true` nếu token hợp lệ; `false` nếu không |
| `user` | Thông tin user (`{ id, email, role }`) khi `valid = true` |
| `reason` | Thông báo lỗi bằng tiếng Việt khi `valid = false` |

**LoginResult:**

| Trường | Mô tả |
|---|---|
| `accessToken` | JWT string |
| `user` | `{ id, email, role }` |
| `expiresIn` | Thời hạn token, vd: `'7d'` |

### Các lỗi có thể nhận được

| Lý do | Nguyên nhân |
|---|---|
| `"Chưa có token..."` | Chưa cung cấp `token` hoặc `username`/`password` |
| `"Token không hợp lệ hoặc đã hết hạn..."` | Token sai hoặc JWT đã hết hạn |
| `"Không thể kết nối đến ..."` | `baseUrl` sai hoặc server offline |
| `"HTTP 403"` | Token hợp lệ nhưng không đủ quyền |
| `"HTTP 500"` | Lỗi server bên phía API |

---

## 10. Kiểm tra tương thích Node (tuỳ chọn)

CI đã chạy matrix Node 18/20/22. Nếu muốn kiểm tra cục bộ với nhiều phiên bản, dùng `nvm`:

```bash
nvm install 18 && nvm use 18 && npm ci && npm test
nvm install 20 && nvm use 20 && npm ci && npm test
nvm install 22 && nvm use 22 && npm ci && npm test
```

---

## 11. Checklist tiền-release

```
[ ] npm ci chạy sạch (không lệch lockfile)
[ ] npm run typecheck   -> xanh
[ ] npm run lint        -> xanh
[ ] npm run format:check-> xanh
[ ] npm run test        -> tất cả test pass
[ ] npm run test:coverage -> coverage ở mức chấp nhận được
[ ] npm run build       -> tạo đủ dist + .d.ts
[ ] npm pack --dry-run  -> đúng nội dung package
[ ] Smoke test cài từ tarball chạy được
[ ] Auth / login flow chạy đúng (nếu có thay đổi auth)
[ ] Validate credentials chạy đúng (nếu có thay đổi auth)
[ ] Test trên project Next.js (nếu có thay đổi API/renderer)
[ ] Examples chạy đúng trên trình duyệt (nếu có thay đổi renderer)
```

Khi toàn bộ checklist xanh, chuyển sang [RELEASE.md](./RELEASE.md) để phát hành.
