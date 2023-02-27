import Component from "@glimmer/component";

interface MultiSelectTagChipComponentSignature {
  Args: {
    option: string;
  };
}

export default class MultiSelectTagChipComponent extends Component<MultiSelectTagChipComponentSignature> {}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'Multiselect::TagChip': typeof MultiSelectTagChipComponent;
  }
}
