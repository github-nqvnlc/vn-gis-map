# Hướng dẫn Testing — `tests/` & vitest

Package dùng [Vitest](https://vitest.dev/) làm test framework với môi trường jsdom, V8 coverage. Tài liệu này mô tả cách test hiện có, cách chạy, và cách viết test mới.

> Tài liệu này là bản phân tích chi tiết. File `TESTING.md` gốc trong repo là một bản gốc ngắn hơn — bản này chỉ bổ sung.

---

## 1. Cấu hình test

**File**: `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',                        // Môi trường DOM giả lập
    globals: true,                               // Không cần import describe/it/expect
    coverage: {
      provider: 'v8',                            // Coverage engine
      reporter: ['text', 'json', 'html'],        // 3 dạng output
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],                 // file re-export không cần test
    },
  },
  resolve: {
    alias: {
      '@': '/src',                               // hỗ trợ alias import nếu cần
    },
  },
});
```

> `globals: true` nên ta không phải `import { describe, it, expect } from 'vitest'` mặc dù các test file vẫn import để rõ ràng.

### Scripts (package.json)

| Lệnh | Mô tả |
|---|---|
| `npm test` | `vitest run` — chạy tất cả test 1 lần (single-run). |
| `npm run test:watch` | `vitest` — chạy watch mode, rerun khi file thay đổi. |
| `npm run test:coverage` | `vitest run --coverage` — sinh báo cáo coverage vào `coverage/`. |

---

## 2. Cấu trúc thư mục `tests/`

```
tests/
├── apiclient.test.ts       ← test ApiClient
├── bounds.test.ts          ← test hằng số địa lý
├── cache.test.ts           ← test class Cache
├── eventemitter.test.ts    ← test EventEmitter
├── geojson.test.ts         ← test type guards
├── layermanager.test.ts    ← test LayerManager (với mock renderer)
└── style.test.ts           ← test mergeStyle và style presets
```

Mỗi file test là một mirror module. Quy ước đặt tên: `<moduleName>.test.ts`.

---

## 3. Tổng quan test hiện có (~60 test case)

### `apiclient.test.ts` (~30 case) — nhiều nhất

Bao phủ toàn bộ `ApiClient`. Chia thành **4 nhóm describe**:

| Nhóm | Test chính |
|---|---|
| `ApiClient` | getProvinces, getWards, reverseGeocode, caching, error handling, clearCache, setToken. |
| `ApiClient response format` | raw / envelope / auto (auto-detect). |
| `ApiClient.validate()` | 200 OK, 401, 403, network error, override, trailing slash, extra fields, no-token. |
| `ApiClient.login()` | success, override, 401, 422, array messages, unexpected shape. |
| `ApiClient auto-login (username + password)` | first-call auto-login, pre-existing token, cache-after-login, auto-login fail, setToken-no-relogin, validate-no-credentials. |

Kỹ thuật chính: **mock `fetch` toàn cục** qua `vi.stubGlobal('fetch', fetchMock)`.

```ts
function mockJsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
  } as unknown as Response;
}

function mockJsonClient() {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  fetchMock = mockJsonClient();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
```

### `bounds.test.ts` (~5 case)

- `north > south`, `east > west`.
- `center` nằm trong bounds.
- `asBounds` đúng format `[[south, west], [north, east]]`.
- `VN_DEFAULT_ZOOM` hợp lý (5-7).
- `VN_CENTER_LATLNG/LNGLAT` đồng bộ (cùng giá trị nhưng khác thứ tự).

### `cache.test.ts` (~9 case)

| Test | Mục đích |
|---|---|
| `stores and retrieves values` | Round-trip set/get. |
| `returns undefined for missing keys` | Không throw, trả `undefined`. |
| `expires entries after TTL` | Sau khi hết TTL, `get` trả `undefined` và entry bị xoá. |
| `honors per-entry TTL override` | `set(key, value, 5)` dùng TTL riêng. |
| `has() reflects expiry` | `has` cũng trả `false` khi hết hạn. |
| `delete removes an entry` | |
| `clear empties the cache` | |
| `purgeExpired drops only expired entries` | |
| `size purges expired entries before counting` | Lazy purge. |

Dùng `vi.useFakeTimers()` và `vi.advanceTimersByTime(ms)` để mô phỏng thời gian.

### `eventemitter.test.ts` (~6 case)

| Test | Mục đích |
|---|---|
| registers and fires handlers with typed payload | Smoke test cơ bản. |
| supports multiple handlers for the same event | Set semantics. |
| removes a handler with off | off hoạt động. |
| once only fires a single time | once = wrapper tự off. |
| isolates errors thrown in handlers | Lỗi 1 handler không ảnh hưởng handler khác (spy `console.error`). |
| removeAllListeners clears handlers | Có/không truyền event. |

### `geojson.test.ts` (~6 case)

- `isFeatureCollection` đúng với FC và Feature/null/string/number.
- `isFeature` đúng với Feature và FC/null/undefined/array.

### `layermanager.test.ts` (~7 case)

Mock `IRenderer` qua `vi.fn()` để kiểm tra `LayerManager` gọi đúng method của renderer:

```ts
function createMockRenderer(): IRenderer {
  return {
    initialize: vi.fn(),
    setView: vi.fn(),
    fitBounds: vi.fn(),
    addGeoJSON: vi.fn((_g, _o, id?: string) => id ?? 'auto-id'),
    removeLayer: vi.fn(),
    setLayerStyle: vi.fn(),
    setLayerVisibility: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onLayerClick: vi.fn(),
    offLayerClick: vi.fn(),
    destroy: vi.fn(),
    isInitialized: true,
  };
}
```

| Test | Mục đích |
|---|---|
| adds a layer and registers it | Smoke: `add` → `registry.has(...) = true`, `size = 1`. |
| replaces an existing layer with the same id | Idempotency — gọi `add` 2 lần cùng id. |
| removes a layer | |
| clears layers optionally filtered by type | `clear('wards')` chỉ xoá wards. |
| updates style and merges into registry | Style merge đúng. |
| toggles visibility | `toggle` đảo ngược `visible`, gọi renderer.setLayerVisibility. |
| lists layers filtered by type | `list('wards')` chỉ trả wards layer. |

### `style.test.ts`

- `mergeStyle` không mutate, override đúng.
- Style presets có đầy đủ các field bắt buộc (`fillColor`, `strokeColor`...).

---

## 4. Cách chạy

```bash
npm test                 # chạy 1 lần
npm run test:watch       # watch mode
npm run test:coverage    # chạy + sinh coverage
```

Báo cáo coverage sinh ra ở `coverage/index.html` — mở trên browser để xem chi tiết.

---

## 5. Mẹo viết test mới

### 5.1. Template cơ bản

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyClass } from '../src/path/MyClass';

describe('MyClass', () => {
  beforeEach(() => {
    // setup
  });

  it('does something', () => {
    const instance = new MyClass();
    expect(instance.method()).toBe(42);
  });
});
```

### 5.2. Mock fetch (cho ApiClient)

```ts
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => vi.unstubAllGlobals());
```

### 5.3. Mock thời gian

```ts
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

vi.advanceTimersByTime(11_000);    // tua tới 11 giây
```

### 5.4. Mock renderer

```ts
const renderer = {
  initialize: vi.fn(),
  setView: vi.fn(),
  // ... tất cả method của IRenderer
} as unknown as IRenderer;
```

### 5.5. Test async / promise

```ts
it('rejects with error', async () => {
  await expect(apiCall()).rejects.toBeInstanceOf(ApiClientError);
});

it('resolves with value', async () => {
  await expect(apiCall()).resolves.toEqual({ ... });
});
```

### 5.6. Test emit / listener

```ts
const handler = vi.fn();
emitter.on('click', handler);
emitter.emit('click', { target: null });
expect(handler).toHaveBeenCalledOnce();
expect(handler).toHaveBeenCalledWith({ type: 'click', target: null });
```

### 5.7. Test cleanup

Luôn reset mocks/spies trong `afterEach`:

```ts
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
```

---

## 6. Coverage mục tiêu

Trong CI, job `test` chạy `npm run test:coverage` và upload thư mục `coverage/` như artifact.

Hiện tại `vitest.config.ts` cấu hình:

- `include: src/**/*.ts`
- `exclude: src/index.ts` (chỉ là re-export)

Mục tiêu (có thể check qua coverage/index.html):

| Module | Test |
|---|---|
| `ApiClient` | ✅ cao |
| `LayerManager` | ✅ cao |
| `EventEmitter` | ✅ 100% |
| `Cache` | ✅ 100% |
| `bounds.ts` (constants) | ✅ 100% |
| `geojson.types.ts` (guards) | ✅ 100% |
| `style.ts` (mergeStyle + presets) | ✅ cao |
| `VNGisMap` (lớp facade) | ⚠️ thấp — nên test với mock ApiClient/LayerManager/renderer |
| Renderers | ⚠️ thấp — cần DOM thật, tích hợp ở level cao hơn |

---

## 7. Renderers không test trực tiếp — vì sao?

`LeafletRenderer` / `MapLibreRenderer` không có unit test trong `tests/`, lý do:

- Chúng phụ thuộc DOM thật, `window.L` / `window.maplibregl`, tile server... — không phù hợp jsdom.
- Kiểm thử chính là dùng **examples HTML** chạy trên browser thật (`examples/leaflet.html`, `examples/maplibre.html`) và demo qua framework integration (xem README).

Nếu cần test renderer, hãy dùng **Playwright/Cypress** end-to-end test riêng.

---

## 8. Workflow làm việc với test

```
1. Code feature mới trong src/
2. Viết test trong tests/<module>.test.ts
3. Chạy npm run test:watch     ← iter nhanh
4. Chạy npm run test:coverage  ← xem đã cover đủ chưa
5. Mở coverage/index.html
6. Commit
```

Khi test fail, Vitest hiển thị stack trace rõ ràng trong terminal.
