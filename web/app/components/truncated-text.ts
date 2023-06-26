import Component from "@glimmer/component";

interface TruncatedTextComponentSignature {
  Element: HTMLSpanElement;
  Args: {
    tagName?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class TruncatedTextComponent extends Component<TruncatedTextComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    TruncatedText: typeof TruncatedTextComponent;
  }
}
