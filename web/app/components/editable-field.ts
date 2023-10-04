import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { next, schedule, scheduleOnce } from "@ember/runloop";
import { assert } from "@ember/debug";
import { guidFor } from "@ember/object/internals";
import { HermesDocument, HermesUser } from "hermes/types/document";

export const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface EditableFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    value: string | HermesUser[];
    onSave: any; // TODO: type this
    onChange?: (value: any) => void; // TODO: type this
    isSaving?: boolean;
    disabled?: boolean;
    isRequired?: boolean;
    name?: string;
    placeholder?: string;
    tag?: "h1"; // Default is `p`
    type?: "people" | "approvers"; // Default is `string`
    document?: HermesDocument; // Only needed for approvers
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
   * The input or textarea element, if using.
   * Registered by the `inputModifier` action, used for focusing and blurring.
   */
  @tracked private inputElement: HTMLInputElement | HTMLTextAreaElement | null =
    null;

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

  @tracked protected toggleButton: HTMLElement | null = null;
  @tracked protected cancelButton: HTMLElement | null = null;

  /**
   * Whether to use the `PeopleSelect` component. True if the
   * `type` argument is "people" or "approvers".
   */
  protected get typeIsPeople(): boolean {
    return this.args.type === "people" || this.args.type === "approvers";
  }

  /**
   * An asserted-true reference to the @document argument.
   * Passed to the `Person` component if the `type` argument is "approvers"
   * so it can fetch the user's approval status.
   */
  protected get document() {
    assert("this.args.document must exist", this.args.document);
    return this.args.document;
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

  /**
   * The action passed to the `PowerSelectMultiple` component by way of `PeopleSelect`.
   * Updates the local and parent values when the user selects or deselects a person.
   *
   */
  @action protected onChange(value: HermesUser[]) {
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

  /**
   * Keydown handler ultimately passed to PowerSelectMultiple.
   * Overrides
   */
  @action protected onPeopleSelectKeydown(
    update: (value: any) => void,
    powerSelectAPI: any,
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
        this.value = this.cachedValue;
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
  }

  /**
   * The action to disable the editing functions and
   * revert the local value. Called by the cancel button
   * and on Escape keydown.
   */
  @action protected disableEditingAndRevert() {
    this.disableEditing();

    schedule("afterRender", this, () => {
      this.value = this.cachedValue;
      console.log(
        "revering changes (should always be a hermesUser)",
        this.value,
      );
      this.onChange(this.value as HermesUser[]);
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
          this.disableEditingAndRevert();
          break;
        }
        ev.preventDefault();
        this.maybeUpdateValue(this.value);
        break;
      case "Escape":
        ev.preventDefault();
        this.disableEditingAndRevert();
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
    let newValue: string | HermesUser[] | undefined;

    if (eventOrValue instanceof Event) {
      const target = eventOrValue.target;
      assert("target must exist", target);
      if ("value" in target) {
        const value = target.value;
        newValue = value as string | HermesUser[];
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
