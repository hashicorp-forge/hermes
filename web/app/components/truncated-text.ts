import Component from "@glimmer/component";

interface TruncatedTextComponentSignature {
  Element: HTMLSpanElement;
  Args: {
    tagName?: string;
    startingBreakpoint?: "md";
  };
  Blocks: {
    default: [];
  };
}

export default class TruncatedTextComponent extends Component<TruncatedTextComponentSignature> {
  protected get class(): string {
    if (this.args.startingBreakpoint === "md") {
      return "starting-breakpoint-md";
    }
    return "default";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    TruncatedText: typeof TruncatedTextComponent;
  }
}
