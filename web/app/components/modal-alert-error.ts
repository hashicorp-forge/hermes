import Component from "@glimmer/component";

interface ModalAlertErrorComponentSignature {
  Args: {
    onDismiss: () => void;
    title: string;
    description: string;
  };
}

export default class ModalAlertErrorComponent extends Component<ModalAlertErrorComponentSignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'ModalAlertError': typeof ModalAlertErrorComponent;
  }
}
