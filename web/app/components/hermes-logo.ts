import Component from "@glimmer/component";

interface HermesLogoComponentSignature {
  Element: HTMLDivElement;
}

export default class HermesLogoComponent extends Component<HermesLogoComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    HermesLogo: typeof HermesLogoComponent;
  }
}
