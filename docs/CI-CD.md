# CI/CD — GitHub Actions Workflows

Repo dùng GitHub Actions để:
1. **CI**: kiểm tra chất lượng code (typecheck, lint, format, test, build) trên push/PR.
2. **Release**: publish lên npm và tạo GitHub Release khi push tag.

Tài liệu này phân tích chi tiết từng file, mục đích và cách vận hành.

---

## Tổng quan hai workflow

| Workflow | File | Trigger | Mục đích |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | push / pull_request vào `main`, `master`, `develop` | Đảm bảo code pass mọi quality gate trước khi merge. |
| **Release** | `.github/workflows/release.yml` | push tag `v*` | Build + publish npm + tạo GitHub Release. |

Cả hai chạy trên `ubuntu-latest` với GitHub-hosted runners.

---

## 1. CI workflow — `.github/workflows/ci.yml`

### Cấu hình chung

```yaml
name: CI

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
```

| Mục | Ý nghĩa |
|---|---|
| Trigger | push vào `main`/`master`/`develop` + mọi PR đến các nhánh đó. |
| Concurrency | Nếu push commit mới khi CI đang chạy → huỷ run cũ (cancel-in-progress). Tránh tốn tài nguyên. |
| Permissions | Chỉ đọc `contents`, không cần quyền write. |

### 3 job

```
┌──────────┐    ┌─────────────┐    ┌──────────┐
│ quality  │ ─► │   test      │ ─► │  build   │
│ (lint,   │    │ (Node 20,22)│    │ (rollup) │
│  format, │    └─────────────┘    └──────────┘
│ typechk) │
└──────────┘
```

### 1.1. Job `quality` — Lint, format, typecheck

**Các bước**:

1. `actions/checkout@v4` — checkout code.
2. `actions/setup-node@v4` với `node-version: 20`, `cache: 'npm'` — cài Node 20, cache `~/.npm`.
3. `npm ci` — cài dependency từ lockfile (nhanh hơn và reproducible hơn `npm install`).
4. `npm run typecheck` — `tsc --noEmit`.
5. `npm run lint` — `eslint src tests --ext .ts`.
6. `npm run format:check` — `prettier --check` kiểm tra format.

**Mục đích**: Bắt lỗi kiểu, lint violation, format sai.

### 1.2. Job `test` — Unit test + coverage

```yaml
test:
  name: Test (Node ${{ matrix.node-version }})
  runs-on: ubuntu-latest
  strategy:
    fail-fast: false
    matrix:
      node-version: [20, 22]
```

| Thuộc tính | Ý nghĩa |
|---|---|
| `fail-fast: false` | Cả 2 phiên bản Node chạy độc lập — nếu Node 20 fail, Node 22 vẫn chạy để bạn biết Node nào vấn đề. |
| Matrix Node 20 & 22 | Kiểm tra tương thích với cả 2 LTS. |
| Coverage | Chỉ Node 20 mới upload coverage artifact, Node 22 chỉ chạy test. |

Các bước:
1. Checkout.
2. Setup Node (matrix).
3. `npm ci`.
4. `npm run test:coverage` — sinh coverage ra `coverage/`.
5. Upload artifact `coverage/` (chỉ Node 20).

### 1.3. Job `build` — Build gói npm

```yaml
build:
  needs: [quality, test]
```

Phụ thuộc cả `quality` lẫn `test` — chỉ chạy khi 2 job trước pass.

Các bước:
1. Checkout.
2. Setup Node 20.
3. `npm ci`.
4. `npm run build` — Rollup build ESM/CJS/UMD + `.d.ts`.
5. Verify file output tồn tại:
   ```bash
   test -f dist/index.esm.js
   test -f dist/index.cjs.js
   test -f dist/index.umd.js
   test -f dist/index.d.ts
   test -f dist/renderers/leaflet.d.ts
   test -f dist/renderers/maplibre.d.ts
   ```
6. `npm pack --dry-run` — kiểm tra nội dung gói sẽ publish.
7. Upload `dist/` artifact.

### Mục đích các artifact
- `dist/` — để dùng cho Release workflow hoặc smoke test.
- `coverage/` — cho reviewer xem coverage report.

---

## 2. Release workflow — `.github/workflows/release.yml`

### Cấu hình chung

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  id-token: write
```

| Mục | Ý nghĩa |
|---|---|
| Trigger | Push tag bắt đầu bằng `v` (vd `v0.2.0`, `v1.0.0-alpha.1`). |
| Concurrency | KHÔNG cancel-in-progress — release cần chạy hết để tránh publish 2 lần. |
| Permissions | Cần `contents: write` để tạo release, `id-token: write` cho npm provenance. |

### 3 job tuần tự

```
verify ──► publish ──► github-release
```

### 2.1. Job `verify` — Verify trước khi publish

**Bước kiểm tra**:

1. Checkout.
2. Setup Node 20, `registry-url: https://registry.npmjs.org`.
3. `npm ci`.
4. `npm run typecheck`.
5. `npm run lint`.
6. `npm run format:check`.
7. `npm run test` (không coverage để nhanh).
8. `npm run build`.
9. **Verify tag trùng với version** trong `package.json`:

```bash
TAG_VERSION="${GITHUB_REF_NAME#v}"
PKG_VERSION="$(node -p "require('./package.json').version")"
if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
  echo "::error::Tag ($TAG_VERSION) không khớp version trong package.json ($PKG_VERSION)."
  exit 1
fi
```

Nếu bạn push `v0.2.0` nhưng `package.json` là `0.1.0` → fail.

### 2.2. Job `publish` — Publish lên npm

```yaml
publish:
  needs: verify
  environment:
    name: npm-production
    url: https://www.npmjs.com/package/@vn-gis/map
```

| Thuộc tính | Ý nghĩa |
|---|---|
| `environment: npm-production` | GitHub Environment tuỳ chọn — cho phép yêu cầu manual approval trước khi publish. |
| `NODE_AUTH_TOKEN` | Secret `NPM_TOKEN` trong env. |
| `--provenance` | Sinh provenance statement (kết nối package với GitHub repo). |

**Bước tự động detect dist-tag**:

```yaml
- name: Detect npm dist-tag
  id: disttag
  run: |
    TAG_VERSION="${GITHUB_REF_NAME#v}"
    if echo "$TAG_VERSION" | grep -qE '-(alpha|beta|rc|next)'; then
      echo "tag=next" >> "$GITHUB_OUTPUT"
    else
      echo "tag=latest" >> "$GITHUB_OUTPUT"
    fi
```

- Tag chứa `-alpha/beta/rc/next` → `dist-tag: next`.
- Ngược lại → `dist-tag: latest`.

Sau đó:

```yaml
- name: Publish
  run: npm publish --provenance --access public --tag ${{ steps.disttag.outputs.tag }}
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 2.3. Job `github-release` — Tạo GitHub Release

```yaml
github-release:
  needs: publish
  permissions:
    contents: write
  steps:
    - uses: softprops/action-gh-release@v2
      with:
        generate_release_notes: true
        prerelease: ${{ contains(github.ref_name, '-') }}
        name: ${{ github.ref_name }}
```

- Tự sinh release notes từ commits (`generate_release_notes: true`).
- Nếu tag chứa `-` → đánh dấu **prerelease**.
- Tên release = tên tag (vd `v0.2.0`).

---

## 3. Các lệnh release (local)

Xem chi tiết tại `docs/RELEASE.md`. Tóm tắt:

### Stable release

```bash
# Cập nhật version
npm version patch   # 0.1.0 → 0.1.1
# Hoặc: minor / major

# Commit + push tag
git push
git push --tags     # triggers Release workflow
```

### Prerelease

```bash
npm version prerelease --preid=beta   # 0.1.0 → 0.1.1-beta.0
git push && git push --tags
```

### Hotfix từ nhánh cũ

```bash
git checkout v0.1.0 -b hotfix/0.1.1
# fix code, commit
npm version patch
git push origin hotfix/0.1.1 --tags
# Sau khi merge vào main, xoá nhánh
```

---

## 4. Setup lần đầu (một lần)

### 4.1. NPM Token

1. Đăng nhập npmjs.com.
2. **Access Tokens** → **Generate New Token** → **Automation**.
3. Copy token.

### 4.2. GitHub Secret

Repo → **Settings** → **Secrets and variables** → **Actions** → **New secret**:

- **Name**: `NPM_TOKEN`
- **Value**: token từ bước trên.

### 4.3. Environment (tuỳ chọn)

**Settings** → **Environments** → **New environment** → tên `npm-production`.

Bật **Required reviewers** nếu muốn manual approval trước khi publish.

### 4.4. Scope `@vn-gis` trên npm

Đảm bảo scope tồn tại (public). Lần đầu publish với `--access public` sẽ tự tạo.

---

## 5. Tự động sinh .d.ts

Rollup dùng `rollup-plugin-dts` để bundle các file `.d.ts`:

```ts
// rollup.config.ts
{
  input: 'src/index.ts',
  external,
  plugins: [dts()],
  output: {
    file: pkg.types,                     // dist/index.d.ts
    format: 'esm',
  },
}
```

Có 3 entry riêng:

- `dist/index.d.ts` — main API.
- `dist/renderers/leaflet.d.ts` — LeafletRenderer.
- `dist/renderers/maplibre.d.ts` — MapLibreRenderer.

---

## 6. Các biến môi trường và secrets

| Tên | Loại | Mục đích |
|---|---|---|
| `NPM_TOKEN` | Secret | Token npm dùng để publish. |
| `NODE_AUTH_TOKEN` | env (đặt trong workflow) | Truyền token cho `npm publish`. |
| `GITHUB_REF_NAME` | env từ GitHub | Tên ref hiện tại (vd `v0.2.0`). |
| `GITHUB_OUTPUT` | env từ GitHub | File output cho step trước (`disttag.outputs.tag`). |

---

## 7. Xử lý lỗi thường gặp

### "Tag không khớp version"

```
::error::Tag (0.2.0) không khớp version trong package.json (0.1.0).
```

→ Sửa `package.json` rồi tag lại, hoặc dùng `npm version` để bump.

### "Verify before publish failed"

→ Có bước typecheck/lint/test/build fail. Xem log chi tiết.

### "npm publish 401"

→ Token sai hoặc hết hạn. Rotate token trên npmjs.

### "Conflict: Cannot publish over existing version"

→ Bạn publish lại cùng version. Bump version (`npm version patch`).

---

## 8. Workflow gợi ý

```
develop ──push──► CI workflow (chạy test/build, không publish)
   │
   └─merge──► main
              │
              └─npm version minor + git tag──► Release workflow
```

---

## 9. Tóm tắt một lệnh duy nhất

```bash
# Sau khi code đã merge vào main:
npm version minor && git push && git push --tags
```

→ bump version → push code + tag → `release.yml` tự chạy verify + publish + tạo release.
