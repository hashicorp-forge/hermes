import Component from "@glimmer/component";

interface FaviconComponentSignature {
  Element: HTMLImageElement;
  Args: {
    url: string;
  };
}

export default class FaviconComponent extends Component<FaviconComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Favicon: typeof FaviconComponent;
  }
}
