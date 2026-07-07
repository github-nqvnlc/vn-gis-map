# Hướng dẫn Release `@vn-gis/map`

Tài liệu mô tả chi tiết toàn bộ quy trình phát hành package `@vn-gis/map` lên npm — từ chuẩn bị một lần, quy tắc version, các bước release, cho đến xử lý sự cố.

> **Tóm tắt nhanh:** Commit code xong → bump version → push tag `vX.Y.Z` → GitHub Actions tự build + publish + tạo release. Không cần làm gì thủ công.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Chuẩn bị một lần (setup)](#2-chuẩn-bị-một-lần-setup)
3. [Quy tắc SemVer](#3-quy-tắc-semver)
4. [Release stable](#4-release-stable)
5. [Release prerelease (beta / rc)](#5-release-prerelease-beta--rc)
6. [Release hotfix từ nhánh cũ](#6-release-hotfix-từ-nhánh-cũ)
7. [Publish thủ công (fallback)](#7-publish-thủ-công-fallback)
8. [Xác minh sau release](#8-xác-minh-sau-release)
9. [Rollback & xử lý sự cố](#9-rollback--xử-lý-sự-cố)
10. [Checklist nhanh](#10-checklist-nhanh)

---

## 1. Tổng quan hệ thống

### Sơ đồ luồng

```
[code change] → [git push] → [CI workflow]
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                   ▼
              [PR / push main]                   [git tag v*]
                    │                                   │
                    ▼                                   ▼
            CI workflow:                          Release workflow:
            • typecheck                           1. verify: typecheck,
            • lint                                   lint, format,
            • format:check                          test, build, tag check
            • test (Node 20, 22)                  2. publish: npm publish
            • build                                3. github-release:
            • npm pack --dry-run                      tạo GitHub Release
```

### Hai workflow

| Workflow | File | Trigger | Mục đích |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | Push / PR lên `main`, `master`, `develop` | Đảm bảo code đạt chất lượng |
| **Release** | `.github/workflows/release.yml` | Push tag `v*` | Build và publish lên npm |

### Release workflow gồm 3 job

```
verify ──► publish ──► github-release
```

1. **verify** — chạy typecheck, lint, format:check, test, build; kiểm tra tag khớp `version` trong `package.json`.
2. **publish** — build lại và `npm publish --provenance --access public`. Nếu tag chứa `-alpha/beta/rc/next` → dist-tag `next`; ngược lại → `latest`.
3. **github-release** — tạo GitHub Release kèm release notes tự sinh từ commit history.

### Package entry points

| File | Kiểu | Dùng khi |
|---|---|---|
| `dist/index.esm.js` | ESM | Bundler: Vite, Webpack 5, Rollup |
| `dist/index.cjs.js` | CJS | Node.js, CommonJS |
| `dist/index.umd.js` | UMD | Browser `<script>` tag |
| `dist/index.d.ts` | Types | TypeScript declarations |

---

## 2. Chuẩn bị một lần (setup)

### 2.1. Tạo npm access token

1. Đăng nhập [npmjs.com](https://www.npmjs.com/) bằng tài khoản có quyền publish vào scope `@vn-gis`.
2. Vào **Access Tokens** → **Generate New Token** → chọn **Automation**.
3. Copy token (dạng `npm_xxx`).

> **Automation token** không yêu cầu 2FA khi gọi từ CI, phù hợp cho GitHub Actions.

### 2.2. Thêm token vào GitHub Secrets

1. Repo GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - **Name:** `NPM_TOKEN`
   - **Value:** token vừa tạo.

### 2.3. (Khuyến nghị) Tạo Environment bảo vệ

Release workflow tham chiếu environment `npm-production` — bạn có thể yêu cầu approve thủ công trước khi publish:

1. **Settings** → **Environments** → **New environment** → đặt tên `npm-production`.
2. Bật **Required reviewers** và thêm người duyệt nếu muốn.

### 2.4. Đảm bảo scope `@vn-gis` tồn tại trên npm

Lần publish đầu tiên: scope `@vn-gis` phải tồn tại. Package được publish ở chế độ `public` (`publishConfig.access = "public"` trong `package.json`), nên không cần paid plan.

Kiểm tra:

```bash
npm view @vn-gis/map
# Nếu thấy thông tin package -> đã tồn tại
# Nếu 404 -> lần đầu, cần tạo scope trước bằng cách publish lần đầu
```

---

## 3. Quy tắc SemVer

Package tuân theo [Semantic Versioning](https://semver.org/lang/vi):

| Loại thay đổi | Ví dụ | Lệnh bump |
|---|---|---|
| Sửa lỗi, backward compatible | `0.1.0` → `0.1.1` | `npm version patch` |
| Thêm tính năng, backward compatible | `0.1.1` → `0.2.0` | `npm version minor` |
| Breaking change | `0.2.0` → `1.0.0` | `npm version major` |
| Prerelease beta | `1.0.0` → `1.1.0-beta.0` | `npm version preminor --preid=beta` |
| Tăng prerelease | `1.0.0-beta.0` → `1.0.0-beta.1` | `npm version prerelease` |

> Với version `< 1.0.0`, API được coi là chưa ổn định. Breaking change có thể đi kèm minor bump thay vì major.

---

## 4. Release stable

### Bước 1 — Đảm bảo nhánh sạch

```bash
git checkout main
git pull origin main
git status   # phải là "working tree clean"
```

### Bước 2 — Chạy kiểm thử cục bộ

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run test:coverage
npm run build
npm pack --dry-run
```

Hoặc chạy một lệnh duy nhất:

```bash
npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build
```

Xem thêm chi tiết tại [TESTING.md](./TESTING.md).

### Bước 3 — Cập nhật CHANGELOG

Mở `CHANGELOG.md`, chuyển các mục trong `[Unreleased]` sang phần version mới kèm ngày:

```markdown
## [0.2.0] - 2026-07-07

### Added
- Thêm login bằng username/password cho ApiClient (#12)

### Fixed
- Sửa lỗi cache không clear khi setToken (#11)
```

Commit:

```bash
git add CHANGELOG.md
git commit -m "docs: cập nhật CHANGELOG cho 0.2.0"
```

### Bước 4 — Bump version

`npm version` tự cập nhật `package.json`, tạo commit và tag `vX.Y.Z`:

```bash
# Ví dụ: thêm tính năng mới → minor bump
npm version minor -m "chore(release): %s"
```

| Lệnh | Tạo commit | Tạo tag |
|---|---|---|
| `npm version patch` | ✅ | `v0.1.1` |
| `npm version minor` | ✅ | `v0.2.0` |
| `npm version major` | ✅ | `v1.0.0` |
| `npm version preminor --preid=beta` | ✅ | `v0.2.0-beta.0` |

> `%s` trong message được thay bằng version mới (ví dụ `0.2.0`).

### Bước 5 — Push commit và tag

```bash
# Push commit và tag cùng lúc
git push origin main --follow-tags
```

Hoặc tách riêng:

```bash
git push origin main
git push origin --tags
```

Việc push tag `v0.2.0` sẽ trigger **Release workflow** tự động.

### Bước 6 — Theo dõi workflow

1. Repo GitHub → tab **Actions** → chọn run **Release**.
2. Nếu có environment `npm-production` yêu cầu approve: duyệt job **publish**.
3. Theo dõi 3 job: `verify` → `publish` → `github-release`.

### Bước 7 — Xác nhận đã publish

```bash
# Kiểm tra version mới nhất
npm view @vn-gis/map version

# Kiểm tra tất cả dist-tags
npm view @vn-gis/map dist-tags

# Xem thông tin đầy đủ
npm view @vn-gis/map
```

Hoặc truy cập: https://www.npmjs.com/package/@vn-gis/map

---

## 5. Release prerelease (beta / rc)

Dùng khi muốn phát hành bản thử nghiệm mà không ảnh hưởng dist-tag `latest`.

### Tạo bản beta đầu tiên

```bash
# Tạo 0.2.0-beta.0
npm version preminor --preid=beta -m "chore(release): %s"
git push origin main --follow-tags
```

### Tăng số beta tiếp theo

```bash
# 0.2.0-beta.0 → 0.2.0-beta.1
npm version prerelease --preid=beta -m "chore(release): %s"
git push origin main --follow-tags
```

### Quy tắc tự động trong workflow

| Tag | dist-tag | Dùng để cài |
|---|---|---|
| `v0.2.0` (stable) | `latest` | `npm install @vn-gis/map` |
| `v0.2.0-beta.0` | `next` | `npm install @vn-gis/map@next` |
| `v0.2.0-rc.1` | `next` | `npm install @vn-gis/map@next` |
| `v0.2.0-alpha.3` | `next` | `npm install @vn-gis/map@next` |

### Phát hành bản chính thức từ prerelease

```bash
# 1.0.0-beta.5 → 1.0.0 (stable)
npm version minor   # loại bỏ prerelease suffix, bump minor
git push origin main --follow-tags
```

Hoặc nếu chỉ muốn tăng minor:

```bash
npm version patch   # 1.0.0-beta.5 → 1.0.1 (vẫn stable)
git push origin main --follow-tags
```

---

## 6. Release hotfix từ nhánh cũ

Khi cần fix gấp mà nhánh `main` đã có thay đổi chưa sẵn sàng release:

```bash
# Tạo nhánh hotfix từ tag hiện tại
git checkout v0.1.0          # checkout tag
git checkout -b hotfix/0.1.1  # tạo nhánh mới

# Sửa lỗi
git commit -m "fix: sửa lỗi render provinces"

# Bump patch trên nhánh hotfix
npm version patch -m "chore(release): %s"
git push origin hotfix/0.1.1 --follow-tags
# Tag v0.1.1 sẽ trigger release workflow
```

Sau khi publish thành công, merge hotfix vào main:

```bash
git checkout main
git merge hotfix/0.1.1
git push origin main
git branch -d hotfix/0.1.1
```

---

## 7. Publish thủ công (fallback)

Chỉ dùng khi GitHub Actions không khả dụng. Cần quyền publish và đăng nhập npm cục bộ.

### Đăng nhập npm

```bash
npm login
# Nhập username, password, email, và OTP (nếu có 2FA)
```

### Publish stable

```bash
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
npm publish --access public
```

### Publish prerelease

```bash
npm ci && npm run build
npm publish --access public --tag next
```

### PrepublishOnly hook

`prepublishOnly` trong `package.json` đảm bảo `clean + build + typecheck` luôn chạy trước khi publish, kể cả khi publish thủ công:

```bash
# npm publish sẽ tự chạy prepublishOnly trước
npm ci
npm publish --access public
```

---

## 8. Xác minh sau release

Sau khi workflow xanh, kiểm tra:

```bash
# 1. Version trên npm
npm view @vn-gis/map version
# -> Phải trả về version vừa release

# 2. Dist-tags
npm view @vn-gis/map dist-tags
# -> Stable: { latest: '0.2.0' }
# -> Prerelease: { latest: '0.1.0', next: '0.2.0-beta.0' }

# 3. Cài thử ở project sạch
mkdir /tmp/test-vn-gis && cd /tmp/test-vn-gis
npm init -y
npm install @vn-gis/map leaflet
node -e "const {VNGisMap} = require('@vn-gis/map'); console.log('OK')"
```

Kiểm tra trên web:
- [ ] Trang npm hiển thị đúng README và metadata
- [ ] GitHub Release đã được tạo tự động
- [ ] Provenance badge xuất hiện trên npm (xác nhận package được publish từ CI)

---

## 9. Rollback & xử lý sự cố

### Publish nhầm version

npm **không** cho phép publish lại cùng một version. Không `npm unpublish` nếu có người phụ thuộc:

- **Cách an toàn:** Phát hành ngay patch mới (ví dụ `X.Y.Z+1`) với bản vá.
- **Cách cực đoan** (chỉ khi chưa ai phụ thuộc, trong vòng 72h):
  ```bash
  npm unpublish @vn-gis/map@0.2.0
  ```

### Gỡ bản lỗi khỏi dist-tag `latest`

```bash
# Trỏ latest về version ổn định trước đó
npm dist-tag add @vn-gis/map@0.1.9 latest

# Hoặc deprecate bản lỗi (khuyến nghị — vẫn cài được nhưng có warning)
npm deprecate @vn-gis/map@0.2.0 "Bản lỗi, dùng 0.2.1 trở lên"
```

### Tag sai / cần làm lại

```bash
# Xoá tag local và remote
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Sửa code / CHANGELOG, tạo lại tag
git commit --amend   # nếu cần sửa commit
git tag v0.2.0        # tạo lại tag (KHÔNG dùng npm version)
git push origin main
git push origin v0.2.0
```

### Workflow báo "Tag không khớp version"

Lỗi này xảy ra khi tag `vX.Y.Z` không khớp với `version` trong `package.json`. Cách xử lý:

```bash
# Kiểm tra
echo $GITHUB_REF_NAME    # v0.2.0
node -p "require('./package.json').version"  # 0.2.0

# Nếu lệch → dùng npm version để đồng bộ
npm version 0.2.0 -m "chore: sync version"
git push origin main --follow-tags
```

### Lỗi `E403 Forbidden` khi publish

- Token `NPM_TOKEN` trong GitHub Secrets có thể hết hạn hoặc thiếu quyền.
- Kiểm tra: token phải có quyền **Automation** và quyền publish vào scope `@vn-gis`.

### Lỗi build trên CI nhưng local OK

Xóa `node_modules` và cài lại:

```bash
rm -rf node_modules
npm ci
npm run build
```

### CI bị cắt do timeout

Kiểm tra log job: thường do `npm ci` chậm hoặc test coverage lâu. Tăng timeout trong workflow hoặc tối ưu test.

---

## 10. Checklist nhanh

```
[ ] Nhánh main sạch, đã pull mới nhất
[ ] npm ci
[ ] npm run typecheck -> xanh
[ ] npm run lint       -> xanh
[ ] npm run format:check -> xanh
[ ] npm run test       -> 79/79 pass
[ ] npm run build      -> dist/ đầy đủ
[ ] npm pack --dry-run -> đúng nội dung
[ ] CHANGELOG cập nhật cho version mới
[ ] npm version <patch|minor|major> -m "chore(release): %s"
[ ] git push origin main --follow-tags
[ ] Theo dõi Actions: verify -> publish -> github-release
[ ] npm view @vn-gis/map version -> đúng version mới
[ ] GitHub Release được tạo tự động
```

---

## Phụ lục: GitHub Actions workflow chi tiết

### CI workflow (`.github/workflows/ci.yml`)

Chạy trên mọi push/PR vào `main`, `master`, `develop`:

| Job | Runs on | Nhiệm vụ |
|---|---|---|
| `quality` | Node 20 | typecheck, lint, format:check |
| `test` | Node 20, 22 | vitest + coverage |
| `build` | Node 20 | rollup build + verify output |

> `build` job phụ thuộc `quality` và `test` (chỉ chạy khi cả hai xanh).

### Release workflow (`.github/workflows/release.yml`)

Trigger: push tag `v*`.

| Job | Phụ thuộc | Mô tả |
|---|---|---|
| `verify` | — | typecheck, lint, format:check, test, build, tag version check |
| `publish` | `verify` | build, detect dist-tag, `npm publish --provenance` |
| `github-release` | `publish` | tạo GitHub Release với release notes tự sinh |

### Environment protection

Job `publish` dùng environment `npm-production`. Nếu bật required reviewers, job sẽ **pause** chờ approve trước khi publish. Approve qua: GitHub → Actions → workflow run → **Review deployments**.
