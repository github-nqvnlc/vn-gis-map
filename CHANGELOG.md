# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-07-09

### Changed

- **Complete rewrite** of the library with simplified API
- Removed `ApiClient` dependency (no longer connects to vn-gis-api)
- Removed `LayerManager` (layer management now handled internally)
- Removed province/ward GeoJSON fetching (manual GeoJSON layer support only)
- Removed `reverseGeocode()` method
- Removed style presets and dynamic style functions (use standard GeoJSON styling)
- Updated package description to reflect new capabilities

### Added

- Simplified `VNGisMap` class with straightforward API
- Support for custom layers: markers, polygons, and GeoJSON
- Map configuration options: center, zoom, minZoom, maxZoom, bounds
- Vietnam-specific constants: `VN_CENTER`, `VN_BOUNDS`, `VN_*_ZOOM` levels
- Enhanced event system with map click, zoom, move, and layer events
- New HTML examples demonstrating all features
- Comprehensive API documentation in `docs-v2.0.0/`

### Removed

- vn-gis-api integration
- Province/Ward GeoJSON fetching
- Authentication features
- Custom styling presets

## [0.1.2] - 2026-07-06

### Fixed

- Documentation improvements

## [0.1.1] - 2026-07-06

### Fixed

- Build configuration fixes

## [0.1.0] - 2026-07-06

### Added

- Initial release of `@vn-gis/map`.
- Core `VNGisMap` class with high-level API for rendering Vietnam GIS maps.
- Renderer-agnostic architecture via the `IRenderer` interface.
- `LeafletRenderer` adapter (peer dependency: `leaflet`).
- `MapLibreRenderer` adapter (peer dependency: `maplibre-gl`).
- `ApiClient` for `vn-gis-api` integration with Bearer auth and TTL caching.
- `LayerManager` for layer lifecycle management (provinces, wards, custom).
- `EventEmitter` for typed map events.
- Built-in support for provinces, wards (per province), and custom GeoJSON layers.
- Reverse geocoding via `reverseGeocode(lng, lat)`.
- Default style presets and dynamic style functions.
- Popup and tooltip support for interactive features.
- Vietnam bounds/center/zoom constants.
- ESM, CJS, and UMD builds with TypeScript declarations.
- Sub-path exports: `@vn-gis/map/leaflet` and `@vn-gis/map/maplibre`.
- Vanilla HTML examples for both renderers.
- Unit tests for core utilities, cache, events, API client, and layer manager.

[Unreleased]: https://github.com/vn-gis/map/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/vn-gis/map/releases/tag/v2.0.0
[0.1.2]: https://github.com/vn-gis/map/releases/tag/v0.1.2
[0.1.1]: https://github.com/vn-gis/map/releases/tag/v0.1.1
[0.1.0]: https://github.com/vn-gis/map/releases/tag/v0.1.0
