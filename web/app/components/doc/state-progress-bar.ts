import Component from "@glimmer/component";

interface DocStateProgressBarComponentSignature {
  Element: HTMLLIElement;
}

export default class DocStateProgressBarComponent extends Component<DocStateProgressBarComponentSignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Doc::StateProgressBar': typeof DocStateProgressBarComponent;
  }
}
