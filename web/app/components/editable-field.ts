import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { next, schedule, scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";
import { guidFor } from "@ember/object/internals";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: any;
    onChange: (value: any) => void;
    isLoading?: boolean;
    isSaving?: boolean;
    disabled?: boolean;
    isRequired?: boolean;
    class?: string;
    tag?: "h1" | "div";
    buttonPlacement?: "center";
    buttonOverlayColor?: "white";
    buttonOverlayPaddingBottom?: string;
    name?: string;
    placeholder?: string;
    hideIfEmpty?: boolean;
  };
  Blocks: {
    default: [value: any];
    editing: [
      F: {
        value: any;
        update: (value: any) => void;
        applyPeopleSelectClasses: (element: HTMLElement) => void;
      },
    ];
  };
}

export default class EditableFieldComponent extends Component<EditableFieldComponentSignature> {
  protected id = guidFor(this);

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
   * The input or textarea element, if using.
   * Registered by the `inputModifier` action, used for focusing and blurring.
   */
  @tracked private inputElement: HTMLInputElement | HTMLTextAreaElement | null =
    null;

  @tracked private editingContainer: HTMLElement | null = null;
  @tracked protected relatedButtons: HTMLElement[] = [];
  @tracked protected toggleButton: HTMLElement | null = null;
  @tracked protected cancelButton: HTMLElement | null = null;

  protected get editingBlockIsShown() {
    return this.editingIsEnabled && !this.args.isSaving && !this.args.isLoading;
  }

  protected get readValueIsShown() {
    if (!this.value && this.args.hideIfEmpty) {
      return false;
    }
    return true;
  }

  /**
   * The modifier passed to the `editing` block to apply to the input or textarea.
   * Autofocuses the input and adds a blur listener to commit changes.
   */
  @action protected registerInput(element: HTMLElement) {
    this.inputElement = element as HTMLInputElement | HTMLTextAreaElement;

    if (this.args.class) {
      const classes = this.args.class.split(" ");
      this.inputElement.classList.add(...classes);
    }

    this.applyPeopleSelectClasses(this.inputElement, false);
    this.inputElement.focus();
  }

  @action protected applyPeopleSelectClasses(
    element: HTMLElement,
    onNextRunLoop = true,
  ) {
    const addClasses = () => element.classList.add("relative", "z-10");

    if (onNextRunLoop) {
      next(() => {
        addClasses();
      });
    } else {
      addClasses();
    }
  }

  @action protected registerEditingContainer(element: HTMLElement) {
    this.editingContainer = element;
    const relatedButtons = Array.from(
      this.editingContainer.querySelectorAll("button"),
    ) as HTMLElement[];
    this.relatedButtons.push(...relatedButtons);
  }

  @action protected registerToggleButton(element: HTMLElement) {
    this.toggleButton = element;
    this.relatedButtons = [element];
  }

  @action protected registerCancelButton(element: HTMLElement) {
    this.cancelButton = element;
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

    schedule("afterRender", this, () => {
      this.value = this.cachedValue;
    });
  }

  /**
   * The action to handle Enter and Escape keydowns while the <:editing> block is open.
   * On Enter, the input blurs, causing `maybeUpdateValue` action to run.
   * On Escape, we disable editing.
   */
  @action protected handleKeydown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (document.activeElement === this.cancelButton) {
          ev.preventDefault();
          this.disableEditing();
          break;
        }
        ev.preventDefault();
        this.maybeUpdateValue(this.value);
        break;
      case "Escape":
        ev.preventDefault();
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
