import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { schedule, scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";
import { guidFor } from "@ember/object/internals";
import type { HermesDocument } from "hermes/types/document";
import blinkElement from "hermes/utils/blink-element";
import type { Select } from "ember-power-select/components/power-select";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: string | string[];
    onSave: any; // TODO: type this
    onChange?: (value: any) => void; // TODO: type this
    isSaving?: boolean;
    isReadOnly?: boolean;
    isRequired?: boolean;
    name?: string;
    placeholder?: string;
    buttonSize?: "medium"; // Default is `small`
    tag?: "h1"; // Default is `p`
    document?: HermesDocument; // Used to check an approver's approval status
    includeGroupsInPeopleSelect?: boolean;
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
   * Whether the editing is enabled.
   * Set true by clicking the "read-only" content.
   * Set false on save or dismiss.
   */
  @tracked protected editingIsEnabled = false;

  /**
   * Whether the empty-value error is shown.
   * Set true when a required field is committed with an empty value.
   * Used by the template to show/hide the error.
   */
  @tracked protected emptyValueErrorIsShown = false;

  /**
   * The container div when editing. Registered on insert.
   * Used to locally capture its child buttons as `relatedButtons`
   * which are passed to the `dismissible` modifier.
   */
  @tracked private editingContainer: HTMLElement | null = null;

  /**
   * The array of buttons that should not dismiss the block.
   * Captured when the editingContainer is registered. Passed to the
   * `dismissible` modifier so it doesn't interfere with these buttons on click.
   */
  @tracked protected relatedButtons: HTMLElement[] = [];

  /**
   * The button to toggle edit mode. Registered on insert and
   * added to the `relatedButtons` argument of `dismissible` so
   * it doesn't interfere with the toggle button on click.
   */
  @tracked protected toggleButton: HTMLElement | null = null;

  /**
   * The cancel button. Registered on insert.
   * Used by `onTextFieldKeydown` to check if the cancel button is focused,
   * which determines how the `Enter` is handled.
   */
  @tracked protected cancelButton: HTMLElement | null = null;

  /**
   * Whether to use the `PeopleSelect` component. True if the
   * `type` argument is "people" or "approvers".
   */
  protected get typeIsPeople(): boolean {
    return this.args.value instanceof Array;
  }

  /**
   * Whether the docNumber is shown.
   * True if it's the title field and the document has a docNumber.
   */
  protected get docNumberIsShown() {
    return this.args.name === "title" && this.args.document?.docNumber;
  }

  /**
   * The action passed to the `PowerSelectMultiple` component by way of `PeopleSelect`.
   * Updates the local and parent values when the user selects or deselects a person.
   *
   */
  @action protected onChange(value: string | string[]) {
    this.value = value;

    if (this.args.onChange) {
      this.args.onChange(this.value);
    }
  }

  /**
   * Keydown handler ultimately passed to PowerSelectMultiple.
   * Overrides
   */
  @action protected onPeopleSelectKeydown(
    update: (value: any) => void,
    powerSelectAPI: Select,
    event: KeyboardEvent,
  ) {
    const popoverSelector = ".ember-basic-dropdown-content";

    if (event.key === "Enter") {
      if (!document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();

        assert("updateFunction must exist", update);
        update(powerSelectAPI.selected);
      }
    }

    if (event.key === "Escape") {
      if (document.querySelector(popoverSelector)) {
        event.preventDefault();
        event.stopPropagation();
        powerSelectAPI.actions.close();
      } else {
        this.disableAndRevertChanges();
      }
    }
  }

  /**
   * Registers the editing container and its related buttons,
   * which are passed to the `dismissible` modifier as `related` elements
   * whose focus/click events should not trigger dismissal.
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
   * The action to enable the editing functions.
   * Called when a user clicks the "read only" content.
   */
  @action protected enableEditing() {
    this.editingIsEnabled = true;
  }

  /**
   * The action to disable the editing functions.
   * Called when a user commits their changes or
   * cancels a no-change edit.
   */
  @action protected disableEditing() {
    this.editingIsEnabled = false;
    this.emptyValueErrorIsShown = false;
  }

  /**
   * The action to disable the editing functions and
   * revert the local value. Called by the cancel button
   * and on Escape keydown.
   */
  @action protected disableAndRevertChanges() {
    this.disableEditing();

    schedule("afterRender", this, () => {
      this.value = this.cachedValue;
      this.onChange(this.value as string[]);
    });
  }

  /**
   * The action to handle Enter and Escape keydowns while a textarea is open.
   * On Enter, runs maybeUpdateValue unless the focused element is the cancel button.
   * On Escape and cancelButtonClick, we disable editing and revert the text value.
   */
  @action protected onTextFieldKeydown(ev: KeyboardEvent) {
    switch (ev.key) {
      case "Enter":
        if (document.activeElement === this.cancelButton) {
          ev.preventDefault();
          this.disableAndRevertChanges();
          break;
        }
        ev.preventDefault();
        this.maybeUpdateValue(this.value);
        break;
      case "Escape":
        ev.preventDefault();
        this.disableAndRevertChanges();
        break;
    }
  }

  /**
   * The action run when a user commits their changes.
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
    /**
     * We use JSON.stringify to compare the values because
     * it works for both arrays and strings.
     */
    if (JSON.stringify(newValue) !== JSON.stringify(this.cachedValue)) {
      if (
        newValue === "" ||
        (newValue instanceof Array && newValue.length === 0)
      ) {
        if (this.args.isRequired) {
          if (this.emptyValueErrorIsShown) {
            const error =
              this.editingContainer?.querySelector(".hds-form-error");
            blinkElement(error);
            return;
          }

          this.emptyValueErrorIsShown = true;
          return;
        }

        /**
         * We don't consider an empty value to be a change
         * if the initial value is undefined.
         */
        if (this.args.value === undefined) {
          this.disableEditing();
          return;
        }
      }

      // Trim whitespace from the string
      if (typeof newValue === "string") {
        newValue = newValue.trim();
      }
      this.cachedValue = this.value;

      assert("newValue must be defined", newValue !== undefined);
      this.value = newValue;

      this.args.onSave(this.value);
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
