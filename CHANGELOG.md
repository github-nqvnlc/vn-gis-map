# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/vn-gis/map/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vn-gis/map/releases/tag/v0.1.0
