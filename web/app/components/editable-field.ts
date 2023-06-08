// @ts-nocheck
// TODO: Type this file
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { scheduleOnce } from "@ember/runloop";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default class EditableField extends Component {
  @tracked editing = false;
  @tracked element = null;
  @tracked cachedValue = null;

  @action
  captureElement(el) {
    this.element = el;
  }

  @action
  edit() {
    this.cachedValue = this.args.value;
    this.editing = true;

    // Kinda gross, but this gives focus to the first focusable element in the
    // :editing block, which will typically be an input.
    scheduleOnce("afterRender", this, () => {
      if (this.element && !this.element.contains(document.activeElement)) {
        const firstInput = this.element.querySelector(FOCUSABLE);
        if (firstInput) firstInput.focus();
      }
    });
  }

  @action
  cancel(ev) {
    if (ev.key === "Escape") {
      scheduleOnce("actions", this, () => {
        this.editing = false;
      });
      ev.preventDefault();
    }
  }

  @action
  preventNewlines(ev) {
    if (ev.key === "Enter") {
      ev.preventDefault();
    }
  }

  @action
  update(ev) {
    scheduleOnce("actions", this, () => {
      this.editing = false;
    });

    const newValue = ev instanceof Event ? ev.target.value : ev;
    if (newValue !== this.cachedValue) {
      this.args.onChange?.(newValue);
    }
  }
}
