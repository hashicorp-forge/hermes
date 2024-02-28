import Component from "@glimmer/component";

interface ModalAlertErrorComponentSignature {
  Element: HTMLDivElement;
  Args: {
    onDismiss: () => void;
    title: string;
    description: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ModalAlertErrorComponent extends Component<ModalAlertErrorComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ModalAlertError: typeof ModalAlertErrorComponent;
  }
}
