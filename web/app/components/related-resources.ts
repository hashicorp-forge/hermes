import Component from "@glimmer/component";

interface RelatedResourcesComponentSignature {
  Element: null;
  Args: {};
  Blocks: {
    header: [];
    "list-loading": [];
    "list-error": [];
    list: [];
  };
}

export default class RelatedResourcesComponent extends Component<RelatedResourcesComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    RelatedResources: typeof RelatedResourcesComponent;
  }
}
