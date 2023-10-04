import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { next, schedule, scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";
import { guidFor } from "@ember/object/internals";
import { HermesUser } from "hermes/types/document";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: any;
    field?: string;
    onChange?: (value: any) => void;
    onSave: ((textValue: string) => void) | (() => void);
    onCancel?: (cachedValue?: string[]) => void;
    isLoading?: boolean;
    isSaving?: boolean;
    disabled?: boolean;
    isRequired?: boolean;
    tag?: "h1";
    buttonPlacement?: "center";
    buttonOverlayColor?: "white";
    buttonOverlayPaddingBottom?: string;
    name?: string;
    placeholder?: string;
    type?: "people";
  };
  Blocks: {};
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
  @tracked protected value = this.cachedValue;

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

  protected get field() {
    assert("this.args.field must exist", this.args.field);
    return this.args.field;
  }
  /**
   * The modifier passed to the `editing` block to apply to the input or textarea.
   * Autofocuses the input and adds a blur listener to commit changes.
   */
  @action protected registerInput(element: HTMLElement) {
    this.inputElement = element as HTMLInputElement | HTMLTextAreaElement;

    this.applyPeopleSelectClasses(this.inputElement, false);
    this.inputElement.focus();
  }

  @action protected onChange(value: any) {
    assert("this.args.onChange must exist", this.args.onChange);
    this.value = value;
    this.args.onChange(this.value);
  }

  /**
   * Applies z-index classes to the people-select dropdown.
   * Called when the PeopleSelect component enters edit mode.
   * Allows the dropdown focus styles to render correctly.
   */
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

  @action protected onPeopleSelectKeydown(
    update: (value: any) => void,
    dropdown: any,
    event: KeyboardEvent,
  ) {
    const popoverSelector = ".ember-basic-dropdown-content";

    if (event.key === "Enter") {
      if (!document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();

        assert("updateFunction must exist", update);
        update(dropdown.selected);
      }
    }

    if (event.key === "Escape") {
      if (document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();
        dropdown.actions.close();
      } else {
        this.value = this.cachedValue;
      }
    }
  }

  /**
   * Registers the <:editing> block container and its related buttons,
   * which are passed to the `dismissible` modifier as `related` elements
   * whose focus/click events should not dismiss the block.
   * Called on insert.
   */
  @action protected registerEditingContainer(element: HTMLElement) {
    this.editingContainer = element;
    const relatedButtons = Array.from(
      this.editingContainer.querySelectorAll("button"),
    ) as HTMLElement[];
    this.relatedButtons.push(...relatedButtons);
  }

  /**
   * Locally registers the toggle button and
   * adds it to the list of related buttons to be passed to the `dismissible` modifier.
   *
   */
  @action protected registerToggleButton(element: HTMLElement) {
    this.toggleButton = element;
    this.relatedButtons = [element];
  }

  /**
   * Locally registers the cancel button for use in the `handleKeydown` action.
   * Called on insert.
   */
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

  @action protected disableEditing() {
    this.editingIsEnabled = false;
  }

  /**
   * The action to disable the <:editing> block.
   * Called when a user commits or cancels their edit.
   */
  @action protected revertChanges() {
    schedule("afterRender", this, () => {
      if (this.args.onCancel) {
        this.args.onCancel(this.cachedValue);
      } else {
        this.value = this.cachedValue;
        this.onChange(this.value);
      }
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
          this.revertChanges();
          break;
        }
        ev.preventDefault();
        this.maybeUpdateValue(this.value);
        break;
      case "Escape":
        ev.preventDefault();
        this.disableEditing();
        this.revertChanges();
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
      if ("value" in target) {
        const value = target.value;
        newValue = value as string | string[];
      } else {
        newValue = undefined;
      }
    } else {
      newValue = eventOrValue;
    }

    // Stringified values work for both arrays and strings.
    if (JSON.stringify(newValue) !== JSON.stringify(this.cachedValue)) {
      if (
        newValue === "" ||
        (newValue instanceof Array && newValue.length === 0)
      ) {
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

      // Trim whitespace from the string
      if (typeof newValue === "string") {
        newValue = newValue.trim();
      }

      this.cachedValue = this.value = newValue;

      this.args.onSave(this.value);
    }

    scheduleOnce("actions", this, () => {
      // is this getting called?
      this.disableEditing();
    });
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EditableField: typeof EditableFieldComponent;
  }
}
