import { action } from "@ember/object";
import Component from "@glimmer/component";

interface RelatedResourcesAddExternalResourceSignature {
  Element: null;
  Args: {
    title: string;
    url: string;
    onSubmit: () => void;
    onInput: (e: Event) => void;
    linkIsDuplicate?: boolean;
    titleErrorIsShown?: boolean;
  };
}

export default class RelatedResourcesAddExternalResource extends Component<RelatedResourcesAddExternalResourceSignature> {
  /**
   * Whether an error message should be shown.
   * True if the title is empty or the URL is a duplicate.
   */
  get errorIsShown() {
    return this.args.titleErrorIsShown || this.args.linkIsDuplicate;
  }

  @action protected onSubmit(e: Event) {
    e.preventDefault();
    this.args.onSubmit?.();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "RelatedResources::Add::ExternalResource": typeof RelatedResourcesAddExternalResource;
  }
}
