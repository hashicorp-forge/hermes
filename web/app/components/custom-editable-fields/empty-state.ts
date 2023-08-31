import Component from '@glimmer/component';

interface CustomEditableFieldsEmptyStateComponentSignature {
  Element: null;
  Args: {
  };
  Blocks: {
  };
}

export default class CustomEditableFieldsEmptyStateComponent extends Component<CustomEditableFieldsEmptyStateComponentSignature> {
}

declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    'CustomEditableFields::EmptyState': typeof CustomEditableFieldsEmptyStateComponent;
  }
}
