import Component from "@glimmer/component";
import { RelatedExternalLink } from "../document/sidebar/related-resources";
import { action } from "@ember/object";

interface RelatedResourcesExternalResourceFormComponentSignature {
  Element: HTMLFormElement;
  Args: {
    resource?: RelatedExternalLink;
    url: string;
    title: string;
    onSave: () => void;
    updateFormValues: () => void;
    titleErrorIsShown?: boolean;
    urlIsValid?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export default class RelatedResourcesExternalResourceFormComponent extends Component<RelatedResourcesExternalResourceFormComponentSignature> {
  @action protected onSave(e: Event) {
    // prevent the form from submitting on enter
    e.preventDefault();
    this.args.onSave?.();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResources::ExternalResourceForm": typeof RelatedResourcesExternalResourceFormComponent;
  }
}
