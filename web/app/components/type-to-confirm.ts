import Component from "@glimmer/component";
import { guidFor } from "@ember/object/internals";
import { WithBoundArgs } from "@glint/template";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import TypeToConfirmInput from "./type-to-confirm/input";

type TypeToConfirmInputBoundArgs =
  | "value"
  | "id"
  | "inputValue"
  | "onInput"
  | "onKeydown";

interface TypeToConfirmInterface {
  Input: WithBoundArgs<typeof TypeToConfirmInput, TypeToConfirmInputBoundArgs>;
  hasConfirmed: boolean;
}

interface TypeToConfirmSignature {
  Args: {
    /**
     * The target value to confirm.
     */
    value: string;

    /**
     * The action to run when the input is focused,
     * valid, and the Enter key is pressed.
     */
    onEnter?: () => void;
  };
  Blocks: {
    default: [T: TypeToConfirmInterface];
  };
}

export default class TypeToConfirm extends Component<TypeToConfirmSignature> {
  /**
   * The typed value of the input. Updated on `input` events and used
   * to compare against the `value` argument to determine validity.
   */
  @tracked protected inputValue = "";

  /**
   * Whether the input value matches the `value` argument.
   * Used internally to determine if the `onEnter` action should be called.
   * Yielded to the block to allow for custom UI based on the input's validity,
   */
  @tracked protected hasConfirmed = false;

  /**
   * The unique identifier for the component.
   * Used to associate the input with its label.
   */
  protected get id() {
    return guidFor(this);
  }

  /**
   * The action to update and validate the input value.
   * Called on `input` events. If the input value matches the `value` argument,
   * sets `hasConfirmed` to `true`. Otherwise, sets `hasConfirmed` to `false`.
   */
  @action protected onInput(event: Event) {
    this.inputValue = (event.target as HTMLInputElement).value;

    if (this.inputValue === this.args.value) {
      this.hasConfirmed = true;
    } else {
      this.hasConfirmed = false;
    }
  }

  /**
   * The action to run on input keydown.
   * Calls the passed in `onEnter` action if it's present,
   * the input is valid, and the Enter key is pressed.
   */
  @action protected onKeydown(event: KeyboardEvent) {
    const { onEnter } = this.args;

    if (onEnter && this.hasConfirmed && event.key === "Enter") {
      onEnter();
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    TypeToConfirm: typeof TypeToConfirm;
  }
}
