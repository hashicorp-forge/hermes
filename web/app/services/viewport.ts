import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { debounce } from "@ember/runloop";

/**
 * Viewport listener service.
 * Tracks the width of the viewport.
 * Helps with responsive design.
 */
export default class ViewportService extends Service {
  constructor() {
    super();
    window.addEventListener("resize", this.onResize);
  }

  /**
   * The width of the viewport.
   * Updated on resize.
   */
  @tracked width = window.innerWidth;

  /**
   * The action to run when the viewport is resized.
   * Sets the local width variable to the new width.
   * Debounced to prevent excessive calls.
   */
  @action onResize(): void {
    debounce(
      this,
      (): void => {
        this.width = window.innerWidth;
      },
      10,
    );
  }

  /**
   * The action to run when the service is destroyed.
   * Removes the resize listener.
   */
  willDestroy(): void {
    window.removeEventListener("resize", this.onResize);
  }
}
