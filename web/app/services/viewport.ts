import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

export const VIEWPORT_WIDTHS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export default class ViewportService extends Service {
  constructor() {
    super(...arguments);
    window.addEventListener("resize", this.debouncedUpdate);
  }

  get widthIsSm() {
    return this.width >= VIEWPORT_WIDTHS.sm && this.width < VIEWPORT_WIDTHS.md;
  }

  get widthIsMd() {
    return this.width >= VIEWPORT_WIDTHS.md && this.width < VIEWPORT_WIDTHS.lg;
  }

  get widthIsLg() {
    return this.width >= VIEWPORT_WIDTHS.lg && this.width < VIEWPORT_WIDTHS.xl;
  }

  get widthIsXL() {
    return (
      this.width >= VIEWPORT_WIDTHS.xl && this.width < VIEWPORT_WIDTHS["2xl"]
    );
  }

  get widthIs2XL() {
    return this.width >= VIEWPORT_WIDTHS["2xl"];
  }

  @tracked width: number = window.innerWidth;

  @action private debouncedUpdate() {
    debounce(this, this.updateVariables, 100);
  }

  @action private updateVariables() {
    this.width = window.innerWidth;
  }

  willDestroy() {
    window.removeEventListener("resize", this.debouncedUpdate);
  }
}
