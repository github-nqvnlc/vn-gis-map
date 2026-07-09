# Hướng dẫn Release - @vn-gis/map v2.0.0

## Mục lục

1. [Quy trình Release](#quy-trình-release)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Cách tạo Release](#cách-tạo-release)
4. [Versioning](#versioning)
5. [ Checklist trước Release](#checklist-trước-release)
6. [Thông báo Release](#thông-báo-release)

---

## Quy trình Release

```
┌─────────────────────────────────────────────────────────────┐
│                    QUY TRÌNH RELEASE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Checkout và Update              2. Chạy Tests           │
│  ┌─────────────────────┐          ┌─────────────────────┐  │
│  │ git checkout main    │    →     │ npm run test        │  │
│  │ git pull origin main │          │ npm run typecheck   │  │
│  │ git merge develop    │          │ npm run lint        │  │
│  └─────────────────────┘          └─────────────────────┘  │
│                    ↓                    ↓                   │
│                                                             │
│  3. Build Production              4. Tạo GitHub Release     │
│  ┌─────────────────────┐          ┌─────────────────────┐  │
│  │ npm run build       │    →     │ git tag v2.0.0     │  │
│  │ Kiểm tra output     │          │ git push --tags    │  │
│  └─────────────────────┘          └─────────────────────┘  │
│                    ↓                                        │
│                                                             │
│  5. GitHub Actions tự động                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CI → Build & Test → Publish to npm                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflow

### CI Workflow (luôn chạy)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run lint
        run: npm run lint
      
      - name: Run typecheck
        run: npm run typecheck
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ matrix.node-version }}
          path: dist/
```

### Release Workflow (chạy khi push tag)

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*.*.*'  # ví dụ: v2.0.0, v2.0.1, v2.1.0

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate package.json
        run: node scripts/validate-package.js
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Run lint
        run: npm run lint
      
      - name: Run typecheck
        run: npm run typecheck
      
      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          draft: false
          prerelease: ${{ contains(steps.version.outputs.VERSION, 'beta') || contains(steps.version.outputs.VERSION, 'alpha') }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload release assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: dist/
          asset_name: release-assets.zip
          asset_content_type: application/zip
```

---

## Cách tạo Release

### Bước 1: Chuẩn bị code

```bash
# 1. Checkout main branch
git checkout main
git pull origin main

# 2. Merge từ develop (nếu có)
git merge develop

# 3. Push changes
git push origin main
```

### Bước 2: Chạy kiểm tra cục bộ

```bash
# Cài đặt dependencies
npm ci

# Chạy tất cả checks
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # Unit tests
npm run test:coverage # Coverage report
npm run build        # Build production
```

### Bước 3: Tạo Git Tag

```bash
# Xem phiên bản hiện tại
npm version

# Tạo tag cho major release (v2.0.0)
git tag -a v2.0.0 -m "Release v2.0.0 - Major rewrite với kiến trúc mới"

# Tạo tag cho minor release (v2.1.0)
git tag -a v2.1.0 -m "Release v2.1.0 - Thêm tính năng mới"

# Tạo tag cho patch release (v2.0.1)
git tag -a v2.0.1 -m "Release v2.0.1 - Bug fixes"

# Push tag lên remote
git push origin v2.0.0
```

### Bước 4: GitHub Actions tự động

Sau khi push tag, GitHub Actions sẽ tự động:

1. **Chạy CI tests** - Kiểm tra tất cả tests
2. **Build production** - Tạo bundles
3. **Publish to npm** - Đẩy package lên npm registry
4. **Tạo GitHub Release** - Tạo release notes và assets

### Bước 5: Xác nhận Release

```bash
# Kiểm tra npm
npm view @vn-gis/map versions --json | tail -5

# Kiểm tra GitHub Releases
# Truy cập: https://github.com/username/vn-gis-map-package/releases
```

---

## Versioning

### Semantic Versioning (SemVer)

```
v{major}.{minor}.{patch}
 │      │      │
 │      │      └── Patch: Bug fixes, docs updates
 │      └───────── Minor: New features tương thích ngược
 └──────────────── Major: Breaking changes
```

### Các loại Release

| Loại | Ví dụ | Mô tả |
|------|-------|--------|
| **Major** | v2.0.0 | Breaking changes, refactor lớn |
| **Minor** | v2.1.0 | Tính năng mới, tương thích ngược |
| **Patch** | v2.0.1 | Bug fixes, hotfixes |
| **Beta** | v2.1.0-beta.1 | Pre-release testing |
| **Alpha** | v2.1.0-alpha.1 | Early development |

### Pre-release Tags

```bash
# Beta release
git tag -a v2.1.0-beta.1 -m "v2.1.0-beta.1"
git push origin v2.1.0-beta.1

# Alpha release  
git tag -a v2.1.0-alpha.2 -m "v2.1.0-alpha.2"
git push origin v2.1.0-alpha.2

# RC (Release Candidate)
git tag -a v2.1.0-rc.1 -m "v2.1.0-rc.1"
git push origin v2.1.0-rc.1
```

---

## Checklist trước Release

### Code

- [ ] Tất cả tests pass (`npm run test`)
- [ ] TypeScript không có lỗi (`npm run typecheck`)
- [ ] ESLint không có warnings (`npm run lint`)
- [ ] Build thành công (`npm run build`)
- [ ] Code đã được review

### Documentation

- [ ] CHANGELOG.md đã được cập nhật
- [ ] README.md đã được cập nhật (nếu cần)
- [ ] API documentation đã được cập nhật
- [ ] Examples hoạt động đúng

### Git

- [ ] Branch main đã được merge
- [ ] Tags đã được tạo
- [ ] Commit messages rõ ràng

### GitHub

- [ ] Secrets đã được cấu hình:
  - [ ] `NPM_TOKEN` - Token để publish npm
- [ ] GitHub Actions logs không có lỗi
- [ ] Release đã được tạo tự động

### npm

- [ ] Package.json version đúng
- [ ] Description và metadata chính xác
- [ ] Package đã publish thành công

---

## Thông báo Release

### Tạo Release Notes tự động

GitHub Actions sử dụng `generate_release_notes: true` để tự động tạo release notes từ commit messages.

### Template Release Notes

```markdown
## What's Changed

### 🚀 Features
- Feature A (#123)
- Feature B (#124)

### 🐛 Bug Fixes
- Fix issue with layer management (#125)

### 📖 Documentation
- Update README (#126)

### 🔧 Maintenance
- Update dependencies (#127)

## New Contributors
- @username made their first contribution in #123

**Full Changelog**: https://github.com/username/vn-gis-map-package/compare/v2.0.0...v2.1.0
```

### Thông báo Manual

Sau khi release, cập nhật các kênh:

1. **GitHub Release** - Tự động tạo bởi Actions
2. **npm** - Package đã publish
3. **Social Media** (tùy chọn)
4. **Email Newsletter** (tùy chọn)

---

## Cấu hình Secrets

### NPM Token

1. Truy cập [npm.npmjs.com](https://www.npmjs.com)
2. Vào **Access Tokens**
3. Tạo **Automation Token** với quyền `Publish`
4. Copy token

### GitHub Secrets

1. Truy cập Repository Settings
2. Vào **Secrets and variables** → **Actions**
3. Thêm secret:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Token vừa copy từ npm

---

## Scripts hỗ trợ

### Script validate-package.js

```javascript
// scripts/validate-package.js
const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
);

const requiredFields = [
  'name',
  'version',
  'description',
  'main',
  'module',
  'types',
  'files',
  'scripts',
  'repository',
  'keywords',
  'license',
  'peerDependencies',
];

const missing = requiredFields.filter((field) => !packageJson[field]);

if (missing.length > 0) {
  console.error('❌ Missing required fields:', missing.join(', '));
  process.exit(1);
}

console.log('✅ package.json validated');
```

### Script release.sh

```bash
#!/bin/bash
# scripts/release.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Bắt đầu release process...${NC}"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${YELLOW}⚠️  Có uncommitted changes. Hãy commit trước.${NC}"
  exit 1
fi

# Get version from argument
VERSION=$1
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh v2.0.0"
  exit 1
fi

echo -e "${GREEN}📦 Release version: $VERSION${NC}"

# Run checks
echo -e "${GREEN}🔍 Chạy checks...${NC}"
npm run lint
npm run typecheck
npm run test
npm run build

# Create tag
echo -e "${GREEN}🏷️  Tạo tag...${NC}"
git tag -a "$VERSION" -m "Release $VERSION"

# Push
echo -e "${GREEN}📤 Push to remote...${NC}"
git push origin main
git push origin "$VERSION"

echo -e "${GREEN}✅ Release đã được khởi tạo!${NC}"
echo -e "${YELLOW}GitHub Actions sẽ tự động chạy CI và publish.${NC}"
```

---

## Troubleshooting

### Lỗi "npm publish failed"

```bash
# Kiểm tra npm login
npm whoami

# Kiểm tra token permissions
npm access ls-collab

# Kiểm tra package name
npm view @vn-gis/map
```

### Lỗi "Workflow not triggered"

```bash
# Kiểm tra tag format
git tag -l

# Verify tag pushed
git ls-remote --tags origin

# Retry workflow từ GitHub UI
```

### Lỗi "Tests failed"

```bash
# Chạy tests cục bộ
npm run test

# Với coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Liên hệ

- **Issues**: https://github.com/username/vn-gis-map-package/issues
- **npm**: https://www.npmjs.com/package/@vn-gis/map
- **Documentation**: https://github.com/username/vn-gis-map-package/tree/main/docs-v2.0.0
