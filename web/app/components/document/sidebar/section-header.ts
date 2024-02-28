import { assert } from "@ember/debug";
import { action } from "@ember/object";
import Component from "@glimmer/component";

interface DocumentSidebarSectionHeaderComponentSignature {
  Element: HTMLDivElement;
  Args: {
    title: string;
    titleTooltipText?: string;
    badgeText?: string;
    buttonLabel?: string;
    buttonAction?: () => void;
    buttonIcon?: string;
    buttonIsHidden?: boolean;
    buttonIsDisabled?: boolean;
    disabledButtonTooltipText?: string;
  };
}

export default class DocumentSidebarSectionHeaderComponent extends Component<DocumentSidebarSectionHeaderComponentSignature> {
  protected get buttonIsShown(): boolean {
    if (this.args.buttonIsDisabled) {
      return true;
    }
    return !!this.args.buttonAction && !this.args.buttonIsHidden;
  }

  @action protected buttonAction(): void {
    if (this.args.buttonIsDisabled) return;

    assert("buttonAction must be defined", this.args.buttonAction);
    this.args.buttonAction();
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Document::Sidebar::SectionHeader": typeof DocumentSidebarSectionHeaderComponent;
  }
}
