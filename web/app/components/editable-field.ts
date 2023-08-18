import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { schedule, scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";
import { modifier } from "ember-modifier";
import { ModifierLike } from "@glint/template";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: any;
    onChange: (value: any) => void;
    loading?: boolean;
    disabled?: boolean;
    isRequired?: boolean;
  };
  Blocks: {
    default: [value: any];
    editing: [
      F: {
        value: any;
        update: (value: any) => void;
        input: ModifierLike<{
          Element: HTMLInputElement | HTMLTextAreaElement;
          Return: void;
        }>;
        errorIsShown: boolean;
        onChange: (value: any) => void;
        disableEditing: () => void;
      },
    ];
  };
}

export default class EditableFieldComponent extends Component<EditableFieldComponentSignature> {
  @tracked protected editingIsEnabled = false;
  @tracked protected emptyValueErrorIsShown = false;
  @tracked protected value = this.args.value;

  @tracked private hasCancelled = false;
  @tracked private inputElement: HTMLInputElement | HTMLTextAreaElement | null =
    null;

  protected inputModifier = modifier((element: HTMLElement) => {
    this.inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    this.inputElement.focus();
    element.addEventListener("blur", this.onBlur);
    return () => element.removeEventListener("blur", this.onBlur);
  });

  @action private onBlur(event: FocusEvent) {
    if (this.hasCancelled) {
      this.value = this.args.value;
      schedule("actions", () => {
        this.hasCancelled = false;
      });
      return;
    }

    this.maybeUpdateValue(event);
  }

  @action protected enableEditing() {
    this.editingIsEnabled = true;
  }

  @action protected disableEditing() {
    this.editingIsEnabled = false;
  }

  @action protected handleKeydown(ev: KeyboardEvent) {
    if (ev.key === "Enter") {
      ev.preventDefault();

      if (this.inputElement) {
        this.inputElement.blur();
      }

      return;
    }

    if (ev.key === "Escape") {
      ev.preventDefault();
      this.hasCancelled = true;
      this.editingIsEnabled = false;
    }
  }

  @action protected maybeUpdateValue(eventOrValue: Event | any) {
    let newValue: string | string[] | undefined;

    console.log("eventOrValue", eventOrValue);
    if (eventOrValue instanceof Event) {
      const target = eventOrValue.target;
      assert("target must exist", target);
      assert("value must exist in the target", "value" in target);
      const value = target.value;
      newValue = value as string | string[];
    }

    if (eventOrValue instanceof Array) {
      newValue = eventOrValue;
    }

    console.log("this.args.value", this.args.value);
    if (newValue !== this.args.value) {
      if (newValue === "") {
        if (this.args.isRequired) {
          this.emptyValueErrorIsShown = true;
          return;
        }
        if (this.args.value === undefined) {
          this.editingIsEnabled = false;
          return;
        }
      }
      console.log("newValue", newValue);

      this.args.onChange?.(newValue);
      // we're not awaiting this... should we be ?
      console.log("this.args.value post-onChange", this.args.value);
    }

    scheduleOnce("actions", this, () => {
      this.editingIsEnabled = false;
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EditableField: typeof EditableFieldComponent;
  }
}
