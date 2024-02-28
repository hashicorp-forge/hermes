import { action } from "@ember/object";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

interface FaviconComponentSignature {
  Element: SVGElement | HTMLImageElement;
  Args: {
    url: string;
  };
}

export default class FaviconComponent extends Component<FaviconComponentSignature> {
  @tracked protected fallbackIconIsShown = false;

  protected readonly faviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${this.args.url}`;

  @action protected showFallbackIcon() {
    this.fallbackIconIsShown = true;
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    Favicon: typeof FaviconComponent;
  }
}
