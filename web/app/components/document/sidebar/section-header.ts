import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentSidebarSectionHeaderComponentSignature {
  Element: null;
  Args: {
    title: string;
    buttonLabel?: string;
    buttonAction?: () => void;
    buttonIcon?: string;
  };
}

export default class DocumentSidebarSectionHeaderComponent extends Component<DocumentSidebarSectionHeaderComponentSignature> {
  get buttonIsShown() {
    return (
      this.args.buttonLabel && this.args.buttonAction && this.args.buttonIcon
    );
  }

  @action buttonAction() {
    assert("buttonAction must be defined", this.args.buttonAction);
    this.args.buttonAction();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::SectionHeader": typeof DocumentSidebarSectionHeaderComponent;
  }
}
