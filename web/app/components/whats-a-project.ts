import Component from "@glimmer/component";

interface WhatsAProjectComponentSignature {
  Element: HTMLDivElement;
}

export default class WhatsAProjectComponent extends Component<WhatsAProjectComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    WhatsAProject: typeof WhatsAProjectComponent;
  }
}
