# Hướng dẫn Release `@vn-gis/map`

Tài liệu này mô tả quy trình phát hành package `@vn-gis/map` lên npm. Việc publish được tự động hoá qua GitHub Actions: bạn chỉ cần đẩy một git tag dạng `vX.Y.Z`, workflow sẽ tự verify, build và publish.

> Trước khi release, hãy chạy đầy đủ các bước kiểm thử trong [TESTING.md](./TESTING.md).

---

## 1. Tổng quan quy trình

```
Cập nhật code  ->  Bump version  ->  Cập nhật CHANGELOG  ->  Tạo & push tag  ->  GitHub Actions publish
```

Có 2 workflow liên quan:

| Workflow | File | Kích hoạt khi | Nhiệm vụ |
| --- | --- | --- | --- |
| CI | `.github/workflows/ci.yml` | push / PR lên `main`, `master`, `develop` | typecheck, lint, format check, test (Node 18/20/22), build |
| Release | `.github/workflows/release.yml` | push tag `v*` | verify lại toàn bộ, publish npm, tạo GitHub Release |

Release workflow gồm 3 job chạy tuần tự:

1. **verify** — chạy lại typecheck, lint, format, test, build và kiểm tra tag khớp với `version` trong `package.json`.
2. **publish** — build lại và `npm publish` với provenance. Prerelease (có `-alpha`/`-beta`/`-rc`/`-next`) được publish vào dist-tag `next`, còn lại vào `latest`.
3. **github-release** — tạo GitHub Release kèm release notes tự sinh.

---

## 2. Chuẩn bị một lần (setup)

### 2.1. Tạo npm access token

1. Đăng nhập [npmjs.com](https://www.npmjs.com/) bằng tài khoản có quyền publish vào scope `@vn-gis`.
2. Vào **Access Tokens** → **Generate New Token** → chọn loại **Automation** (bỏ qua 2FA khi publish trong CI).
3. Copy token (dạng `npm_xxx`).

### 2.2. Thêm token vào GitHub Secrets

1. Vào repo GitHub → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**:
   - Name: `NPM_TOKEN`
   - Value: token vừa tạo.

### 2.3. (Khuyến nghị) Tạo Environment bảo vệ

Release workflow dùng environment tên `npm-production`. Bạn có thể yêu cầu duyệt thủ công trước khi publish:

1. **Settings** → **Environments** → **New environment** → đặt tên `npm-production`.
2. Bật **Required reviewers** và thêm người duyệt nếu muốn có bước approve trước khi publish.

### 2.4. Đảm bảo scope `@vn-gis` tồn tại trên npm

Nếu đây là lần publish đầu tiên, scope `@vn-gis` phải tồn tại và tài khoản/token phải có quyền. Package được publish ở chế độ public (`publishConfig.access = "public"`).

---

## 3. Quy tắc version (SemVer)

Tuân theo [Semantic Versioning](https://semver.org/):

| Loại thay đổi | Ví dụ | Lệnh bump |
| --- | --- | --- |
| Sửa lỗi, không đổi API | `0.1.0` → `0.1.1` | `npm version patch` |
| Thêm tính năng, backward compatible | `0.1.1` → `0.2.0` | `npm version minor` |
| Breaking change | `0.2.0` → `1.0.0` | `npm version major` |
| Prerelease | `1.0.0` → `1.1.0-beta.0` | `npm version preminor --preid=beta` |

> Khi version `< 1.0.0`, API được coi là chưa ổn định; breaking change có thể đi kèm minor bump.

---

## 4. Các bước release (stable)

### Bước 1 — Đảm bảo nhánh sạch và mới nhất

```bash
git checkout main
git pull origin main
git status   # phải "working tree clean"
```

### Bước 2 — Chạy kiểm thử cục bộ

Xem chi tiết ở [TESTING.md](./TESTING.md). Tối thiểu:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm pack --dry-run
```

### Bước 3 — Cập nhật CHANGELOG

Mở `CHANGELOG.md`, chuyển các mục trong `[Unreleased]` sang phần version mới kèm ngày phát hành:

```markdown
## [0.2.0] - 2026-07-06

### Added
- ...

### Fixed
- ...
```

Commit thay đổi CHANGELOG:

```bash
git add CHANGELOG.md
git commit -m "docs: cập nhật CHANGELOG cho 0.2.0"
```

### Bước 4 — Bump version

`npm version` sẽ tự cập nhật `package.json`, tạo commit và tạo tag `vX.Y.Z`:

```bash
npm version minor -m "chore(release): %s"
```

> `%s` được thay bằng version mới. Lệnh này tạo tag `v0.2.0` (khớp với trigger `v*`).

### Bước 5 — Push commit và tag

```bash
git push origin main
git push origin --tags
```

Việc push tag `v0.2.0` sẽ kích hoạt release workflow.

### Bước 6 — Theo dõi workflow

1. Vào tab **Actions** trên GitHub → chọn run **Release**.
2. Nếu có environment yêu cầu approve, duyệt job **publish**.
3. Chờ cả 3 job xanh.

### Bước 7 — Xác nhận đã publish

```bash
npm view @vn-gis/map version
npm view @vn-gis/map dist-tags
```

Hoặc kiểm tra tại https://www.npmjs.com/package/@vn-gis/map.

---

## 5. Release prerelease (beta / rc)

Dùng khi muốn phát hành bản thử nghiệm mà không đụng tới dist-tag `latest`.

```bash
# tạo 1.0.0-beta.0
npm version preminor --preid=beta -m "chore(release): %s"
git push origin main --follow-tags
```

- Tag chứa `-beta` → workflow tự publish vào dist-tag `next`.
- Người dùng cài bản beta bằng: `npm install @vn-gis/map@next`.
- Tăng số beta tiếp theo: `npm version prerelease --preid=beta` (→ `1.0.0-beta.1`).

Khi ổn định, phát hành bản chính thức:

```bash
npm version minor   # 1.0.0-beta.x -> 1.0.0
git push origin main --follow-tags
```

---

## 6. Publish thủ công (fallback khi CI hỏng)

Chỉ dùng khi GitHub Actions không khả dụng. Cần quyền publish và đăng nhập npm cục bộ.

```bash
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
npm login                       # nếu chưa đăng nhập
npm publish --access public     # thêm --tag next cho prerelease
```

> `prepublishOnly` sẽ tự chạy `clean + build + typecheck` trước khi publish.

---

## 7. Kiểm tra sau khi release

- [ ] `npm view @vn-gis/map version` trả về version mới.
- [ ] Cài thử ở project sạch: `npm install @vn-gis/map leaflet` và import chạy được.
- [ ] Kiểm tra provenance hiển thị trên trang npm (badge "Provenance").
- [ ] GitHub Release đã được tạo với release notes.
- [ ] Trang npm hiển thị đúng README, `dist/` và các entrypoint.

---

## 8. Rollback / xử lý sự cố

### Publish nhầm một version

npm **không** cho phép publish lại cùng một version. Cách xử lý:

- **Trong vòng 72 giờ, không ai phụ thuộc:** có thể `npm unpublish @vn-gis/map@X.Y.Z` (cân nhắc kỹ, dễ gây gãy dependency).
- **Cách an toàn hơn:** phát hành ngay một patch mới (ví dụ `X.Y.Z+1`) với bản vá.

### Gỡ một bản lỗi khỏi dist-tag `latest`

```bash
# trỏ latest về version ổn định trước đó
npm dist-tag add @vn-gis/map@0.1.9 latest
# hoặc deprecate bản lỗi
npm deprecate @vn-gis/map@0.2.0 "Bản lỗi, dùng 0.2.1 trở lên"
```

### Tag sai / cần làm lại

```bash
# xoá tag local và remote
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0
# sửa lỗi, sau đó tạo lại tag
```

### Workflow báo "Tag không khớp version trong package.json"

Nghĩa là bạn tạo tag thủ công không đúng version. Hãy dùng `npm version` để đảm bảo đồng bộ, hoặc sửa `package.json` cho khớp tag rồi tạo lại tag.

---

## 9. Checklist nhanh

```
[ ] Nhánh main sạch, đã pull mới nhất
[ ] npm ci
[ ] typecheck / lint / format:check / test / build đều xanh
[ ] npm pack --dry-run kiểm tra nội dung package
[ ] CHANGELOG cập nhật cho version mới
[ ] npm version <patch|minor|major>
[ ] git push origin main --follow-tags
[ ] Theo dõi workflow Release trên Actions
[ ] Xác nhận npm view @vn-gis/map version
```
