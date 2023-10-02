import Component from "@glimmer/component";
import or from "ember-truth-helpers/helpers/or";

interface EmptyStateTextComponentSignature {
  Element: HTMLSpanElement;
  Args: {
    value?: string;
  };
  Blocks: {};
}

export default class EmptyStateTextComponent extends Component<EmptyStateTextComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    EmptyStateText: typeof EmptyStateTextComponent;
  }
}
