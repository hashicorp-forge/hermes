import Component from "@glimmer/component";

interface NewProjectFormTitleAndDescriptionComponentSignature {
  Element: null;
  Args: {
    title: string;
    description: string;
    titleErrorIsShown?: boolean;
    onKeydown: (event: KeyboardEvent) => void;
  };
  Blocks: {
    default: [];
  };
}

export default class NewProjectFormTitleAndDescriptionComponent extends Component<NewProjectFormTitleAndDescriptionComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "New::ProjectForm::TitleAndDescription": typeof NewProjectFormTitleAndDescriptionComponent;
  }
}
