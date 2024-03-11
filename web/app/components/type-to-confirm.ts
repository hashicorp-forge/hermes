import Component from "@glimmer/component";
import { guidFor } from "@ember/object/internals";
import { WithBoundArgs } from "@glint/template";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import TypeToConfirmInput from "./type-to-confirm/input";

type TypeToConfirmInputBoundArgs = "value" | "id" | "inputValue" | "onInput";

interface TypeToConfirmInterface {
  Input: WithBoundArgs<typeof TypeToConfirmInput, TypeToConfirmInputBoundArgs>;
  hasConfirmed: boolean;
}

interface TypeToConfirmSignature {
  Args: {
    value: string;
  };
  Blocks: {
    default: [T: TypeToConfirmInterface];
  };
}

export default class TypeToConfirm extends Component<TypeToConfirmSignature> {
  @tracked protected inputValue = "";
  @tracked protected hasConfirmed = false;

  protected get id() {
    return guidFor(this);
  }

  @action protected updateValue(event: Event) {
    this.inputValue = (event.target as HTMLInputElement).value;

    if (this.inputValue === this.args.value) {
      this.hasConfirmed = true;
    } else {
      this.hasConfirmed = false;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    TypeToConfirm: typeof TypeToConfirm;
  }
}
