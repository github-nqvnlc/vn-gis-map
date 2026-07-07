# Tài liệu `@vn-gis/map`

Thư mục này chứa tài liệu vận hành cho việc kiểm thử và phát hành package `@vn-gis/map`.

## Mục lục

| Tài liệu | Nội dung |
| --- | --- |
| [TESTING.md](./TESTING.md) | Toàn bộ các bước kiểm thử cục bộ trước khi release: pipeline typecheck/lint/format/test/build, coverage, smoke test cài từ tarball, kiểm thử examples trên trình duyệt. |
| [RELEASE.md](./RELEASE.md) | Quy trình phát hành lên npm qua GitHub Actions: setup token, quy tắc version (SemVer), các bước tag & push, prerelease, publish thủ công, rollback. |

## Quy trình tổng quát

```
1. Phát triển & commit code
2. Chạy kiểm thử cục bộ         -> docs/TESTING.md
3. Cập nhật CHANGELOG
4. Bump version + tạo tag       -> docs/RELEASE.md
5. Push tag -> GitHub Actions tự publish lên npm
```

## CI/CD

Hai workflow điều khiển chất lượng và phát hành:

| Workflow | File | Kích hoạt | Nhiệm vụ |
| --- | --- | --- | --- |
| **CI** | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | push / PR lên `main`, `master`, `develop` | typecheck, lint, format check, test (Node 18/20/22), build + kiểm tra artifact |
| **Release** | [`.github/workflows/release.yml`](../.github/workflows/release.yml) | push tag `v*` | verify lại toàn bộ, publish npm (provenance), tạo GitHub Release |

## Yêu cầu cấu hình một lần

Trước lần release đầu tiên, cần thiết lập (chi tiết trong [RELEASE.md](./RELEASE.md)):

- Secret `NPM_TOKEN` (npm Automation token) trong GitHub repository secrets.
- (Khuyến nghị) Environment `npm-production` với người duyệt để kiểm soát bước publish.

## Tài liệu liên quan

- [`../README.md`](../README.md) — hướng dẫn sử dụng thư viện (API, ví dụ).
- [`../CHANGELOG.md`](../CHANGELOG.md) — lịch sử thay đổi theo version.
