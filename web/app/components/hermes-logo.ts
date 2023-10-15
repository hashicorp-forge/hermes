import Component from "@glimmer/component";

interface HermesLogoComponentSignature {
  Element: HTMLDivElement;
  Args: {
    size?: "small";
    isIconOnly?: boolean;
  };
}

export default class HermesLogoComponent extends Component<HermesLogoComponentSignature> {
  protected get isSmall() {
    return this.args.size === "small";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    HermesLogo: typeof HermesLogoComponent;
  }
}
