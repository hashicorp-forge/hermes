import Component from "@glimmer/component";

export interface OverflowItem {
  label: string;
  icon: string;
  action: any;
}

interface RelatedResourcesOverflowMenuComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items: Record<string, OverflowItem>;
    buttonIsShown?: boolean;
  };
}

export default class RelatedResourcesOverflowMenuComponent extends Component<RelatedResourcesOverflowMenuComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResources::OverflowMenu": typeof RelatedResourcesOverflowMenuComponent;
  }
}
