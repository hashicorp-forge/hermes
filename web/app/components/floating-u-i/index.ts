import { assert } from "@ember/debug";
import { action } from "@ember/object";
import { guidFor } from "@ember/object/internals";
import type { OffsetOptions, Placement } from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import type { MatchAnchorWidthOptions } from "./content";

interface FloatingUIAnchorAPI {
  contentIsShown: boolean;
  registerAnchor: (element: HTMLElement) => void;
  toggleContent: () => void;
  showContent: () => void;
  hideContent: () => void;
  contentID: string;
}

interface FloatingUIContentAPI {
  anchor: HTMLElement;
  contentID: string;
  hideContent: () => void;
}

interface FloatingUIComponentSignature {
  Element: HTMLDivElement;
  Args: {
    renderOut?: boolean;
    // TODO: Move null logic to a parent component.
    placement?: Placement | null;
    disableClose?: boolean;
    offset?: OffsetOptions;
    matchAnchorWidth?: MatchAnchorWidthOptions;
  };
  Blocks: {
    anchor: [dd: FloatingUIAnchorAPI];
    content: [dd: FloatingUIContentAPI];
  };
}

export default class FloatingUIComponent extends Component<FloatingUIComponentSignature> {
  readonly contentID = guidFor(this);

  @tracked _anchor: HTMLElement | null = null;
  @tracked content: HTMLElement | null = null;
  @tracked contentIsShown: boolean = this.args.disableClose || false;

  get anchor() {
    assert("_anchor must exist", this._anchor);
    return this._anchor;
  }

  @action registerAnchor(e: HTMLElement) {
    this._anchor = e;

    // Set a value we can use to test that the content component has the correct ID.
    this._anchor.setAttribute("data-anchor-id", this.contentID);
  }

  @action toggleContent() {
    if (this.contentIsShown) {
      this.hideContent();
    } else {
      this.showContent();
    }
  }

  @action showContent() {
    this.contentIsShown = true;
  }

  @action hideContent() {
    if (this.args.disableClose !== true) {
      this.contentIsShown = false;
    }
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    FloatingUI: typeof FloatingUIComponent;
  }
}
