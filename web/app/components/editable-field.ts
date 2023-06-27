import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: any;
    onChange: (value: any) => void;
    loading?: boolean;
    disabled?: boolean;
  };
  Blocks: {
    default: [];
    editing: [
      F: {
        value: any;
        update: (value: any) => void;
      }
    ];
  };
}

export default class EditableFieldComponent extends Component<EditableFieldComponentSignature> {
  @tracked protected editing = false;
  @tracked protected el: HTMLElement | null = null;
  @tracked protected cachedValue = null;

  @action protected captureElement(el: HTMLElement) {
    this.el = el;
  }

  @action protected edit() {
    this.cachedValue = this.args.value;
    this.editing = true;

    // Kinda gross, but this gives focus to the first focusable element in the
    // :editing block, which will typically be an input.
    scheduleOnce("afterRender", this, () => {
      if (this.el && !this.el.contains(document.activeElement)) {
        const firstInput = this.el.querySelector(FOCUSABLE);
        if (firstInput) (firstInput as HTMLElement).focus();
      }
    });
  }

  @action protected cancel(ev: KeyboardEvent) {
    if (ev.key === "Escape") {
      ev.preventDefault();
      scheduleOnce("actions", this, () => {
        this.editing = false;
      });
    }
  }

  @action protected preventNewlines(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();
    }
  }

  @action protected update(eventOrValue: Event | any) {
    scheduleOnce("actions", this, () => {
      this.editing = false;
    });

    let newValue = eventOrValue;

    if (eventOrValue instanceof Event) {
      const target = eventOrValue.target;
      assert("target must exist", target);
      assert("value must exist in the target", "value" in target);
      const value = target.value;
      newValue = value;
    }

    if (newValue !== this.cachedValue) {
      this.args.onChange?.(newValue);
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EditableField: typeof EditableFieldComponent;
  }
}
