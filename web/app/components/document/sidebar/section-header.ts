import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentSidebarSectionHeaderComponentSignature {
  Element: HTMLDivElement;
  Args: {
    title: string;
    buttonLabel?: string;
    buttonAction?: () => void;
    buttonIcon?: string;
    buttonIsHidden?: boolean;
  };
}

export default class DocumentSidebarSectionHeaderComponent extends Component<DocumentSidebarSectionHeaderComponentSignature> {
  protected get buttonIsShown(): boolean {
    return !!this.args.buttonAction && !this.args.buttonIsHidden;
  }

  @action protected buttonAction(): void {
    assert("buttonAction must be defined", this.args.buttonAction);
    this.args.buttonAction();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::SectionHeader": typeof DocumentSidebarSectionHeaderComponent;
  }
}
