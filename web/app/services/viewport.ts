import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";

// Currently based on default Tailwind breakpoints
// TODO: Figure out how to share this with Tailwind and Sass
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

  @tracked width: number = window.innerWidth;

  @action private debouncedUpdate() {
    debounce(this, this.updateVariables, 50);
  }

  @action private updateVariables() {
    this.width = window.innerWidth;
  }

  willDestroy() {
    window.removeEventListener("resize", this.debouncedUpdate);
  }
}
