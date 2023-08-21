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
        emptyValueErrorIsShown: boolean;
      }
    ];
  };
}

export default class EditableFieldComponent extends Component<EditableFieldComponentSignature> {
  /**
   * The cached value of the field.
   * Initially set to the value passed in; updated when committed.
   * Required to handle both the PEOPLE and STRING fieldTypes,
   * which are processed differently by their sub-components.
   */
  private cachedValue = this.args.value;

  /**
   * The value of the field. Initially set to the value passed in.
   * Updated when the user commits their changes.
   */
  @tracked protected value = this.args.value;

  /**
   * Whether the <:editing> block is enabled.
   * Set true by clicking the <:default> content.
   * Set false by the `disableEditing` action on blur.
   */
  @tracked protected editingIsEnabled = false;

  /**
   * Whether the empty-value error is shown.
   * Set true when a required field is committed with an empty value.
   * Yielded to the <:editing> block to show/hide the error.
   */
  @tracked protected emptyValueErrorIsShown = false;

  /**
   * Whether the user has cancelled their edit using the Escape key.
   * Used on blur to determine whether to reset the value to the original.
   * Set true by the `handleKeydown` task on Escape keydown.
   */
  @tracked private hasCancelled = false;

  /**
   * The input or textarea element, if using.
   * Registered by the `inputModifier` action, used for focusing and blurring.
   */
  @tracked private inputElement: HTMLInputElement | HTMLTextAreaElement | null =
    null;

  /**
   * The modifier passed to the `editing` block to apply to the input or textarea.
   * Autofocuses the input and adds a blur listener to commit changes.
   */
  protected inputModifier = modifier((element: HTMLElement) => {
    this.inputElement = element as HTMLInputElement | HTMLTextAreaElement;
    this.inputElement.focus();
    element.addEventListener("blur", this.onBlur);
    return () => element.removeEventListener("blur", this.onBlur);
  });

  /**
   * The action run when an `inputModifier`-registered input blurs.
   * If blurring is the result of a cancel, the value is reset to the original,
   * otherwise the value is passed to the `maybeUpdateValue` method.
   */
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

  /**
   * The action to enable the <:editing> block.
   * Called when a user clicks the <:default> content.
   */
  @action protected enableEditing() {
    this.editingIsEnabled = true;
  }

  /**
   * The action to disable the <:editing> block.
   * Called when a user commits or cancels their edit.
   */
  @action protected disableEditing() {
    this.editingIsEnabled = false;
  }

  /**
   * The action to handle Enter and Escape keydowns while the <:editing> block is open.
   * On Enter, the input blurs, causing `maybeUpdateValue` action to run.
   * On Escape, we disable editing.
   */
  @action protected handleKeydown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        ev.preventDefault();
        if (this.inputElement) {
          this.inputElement.blur();
        }
        break;
      case "Escape":
        ev.preventDefault();
        this.hasCancelled = true;
        this.disableEditing();
        break;
    }
  }

  /**
   * The action run when the <:editing> block is committed.
   * Checks the value to see if it has changed, and if so, updates the value
   * and resets the cached value. If the value is empty and the field is required,
   * triggers the empty-value error.
   */
  @action protected maybeUpdateValue(eventOrValue: Event | any) {
    let newValue: string | string[] | undefined;

    if (eventOrValue instanceof Event) {
      const target = eventOrValue.target;
      assert("target must exist", target);
      assert("value must exist in the target", "value" in target);
      const value = target.value;
      newValue = value as string | string[];
    } else {
      newValue = eventOrValue;
    }

    // Stringified values work for both arrays and strings.
    if (JSON.stringify(newValue) !== JSON.stringify(this.cachedValue)) {
      if (newValue === "") {
        if (this.args.isRequired) {
          this.emptyValueErrorIsShown = true;
          return;
        }
        // Nothing has really changed, so we don't update the value.
        if (this.args.value === undefined) {
          this.disableEditing();
          return;
        }
      }

      this.cachedValue = this.value = newValue;
      this.args.onChange?.(this.value);
    }

    scheduleOnce("actions", this, () => {
      this.disableEditing();
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EditableField: typeof EditableFieldComponent;
  }
}
