import Component from "@glimmer/component";

interface ExternalLinkComponentSignature {
  Element: HTMLAnchorElement;
  Blocks: {
    default: [];
  };
}

export default class ExternalLinkComponent extends Component<ExternalLinkComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ExternalLink: typeof ExternalLinkComponent;
  }
}
