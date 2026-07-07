import type { VNGeoJSONCollection } from '../types/api.types';
import type { LayerOptions, LayerStyle, RegisteredLayer } from '../types/config.types';
import type { IRenderer } from '../renderers/base/IRenderer';

/**
 * Quản lý vòng đời các layer đã thêm vào map.
 *
 * LayerManager giữ registry của tất cả layers (provinces, wards, custom) và
 * uỷ thác thao tác render xuống {@link IRenderer}. Nó tách biệt logic quản lý
 * trạng thái khỏi renderer cụ thể (Leaflet/MapLibre).
 */
export class LayerManager {
  private readonly renderer: IRenderer;
  private readonly registry = new Map<string, RegisteredLayer>();

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  /**
   * Thêm 1 layer GeoJSON và đăng ký vào registry.
   *
   * @param id - Định danh duy nhất cho layer. Nếu trùng, layer cũ bị xoá trước.
   * @param type - Loại layer.
   * @param geojson - Dữ liệu GeoJSON.
   * @param options - Tuỳ chọn render.
   * @param meta - Metadata phụ (provinceCode/source).
   * @returns Layer đã đăng ký.
   */
  add(
    id: string,
    type: RegisteredLayer['type'],
    geojson: VNGeoJSONCollection,
    options: LayerOptions = {},
    meta?: RegisteredLayer['meta'],
  ): RegisteredLayer {
    if (this.registry.has(id)) {
      this.remove(id);
    }

    const nativeId = this.renderer.addGeoJSON(geojson, options, id);
    const style: LayerStyle = options.style ?? {};

    const registered: RegisteredLayer = {
      id,
      type,
      nativeLayer: nativeId,
      options,
      meta,
      style,
      visible: true,
    };
    this.registry.set(id, registered);
    return registered;
  }

  /**
   * Xoá 1 layer khỏi map và registry.
   */
  remove(id: string): boolean {
    const layer = this.registry.get(id);
    if (!layer) return false;
    this.renderer.removeLayer(id);
    this.registry.delete(id);
    return true;
  }

  /**
   * Xoá tất cả layers (tuỳ chọn lọc theo type).
   */
  clear(type?: RegisteredLayer['type']): void {
    for (const [id, layer] of this.registry.entries()) {
      if (type && layer.type !== type) continue;
      this.renderer.removeLayer(id);
      this.registry.delete(id);
    }
  }

  /**
   * Cập nhật style cho 1 layer.
   */
  setStyle(id: string, style: LayerStyle): boolean {
    const layer = this.registry.get(id);
    if (!layer) return false;
    this.renderer.setLayerStyle(id, style);
    layer.style = { ...layer.style, ...style };
    return true;
  }

  /**
   * Ẩn/hiện 1 layer.
   */
  setVisibility(id: string, visible: boolean): boolean {
    const layer = this.registry.get(id);
    if (!layer) return false;
    this.renderer.setLayerVisibility(id, visible);
    layer.visible = visible;
    return true;
  }

  /**
   * Bật/tắt hiển thị 1 layer.
   */
  toggle(id: string): boolean {
    const layer = this.registry.get(id);
    if (!layer) return false;
    return this.setVisibility(id, !layer.visible);
  }

  /**
   * Lấy thông tin 1 layer đã đăng ký.
   */
  get(id: string): RegisteredLayer | undefined {
    return this.registry.get(id);
  }

  /**
   * True nếu layer tồn tại.
   */
  has(id: string): boolean {
    return this.registry.has(id);
  }

  /**
   * Danh sách tất cả layers đã đăng ký.
   */
  list(type?: RegisteredLayer['type']): RegisteredLayer[] {
    const all = Array.from(this.registry.values());
    return type ? all.filter((l) => l.type === type) : all;
  }

  /**
   * Số lượng layers đang quản lý.
   */
  get size(): number {
    return this.registry.size;
  }
}
