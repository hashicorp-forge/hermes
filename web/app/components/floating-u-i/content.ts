import { assert } from "@ember/debug";
import { action } from "@ember/object";
import {
  OffsetOptions,
  Placement,
  autoUpdate,
  computePosition,
  detectOverflow,
  flip,
  offset,
  platform,
  shift,
  MiddlewareState,
} from "@floating-ui/dom";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import htmlElement from "hermes/utils/html-element";

export type MatchAnchorWidthOptions =
  | boolean
  | {
      enabled: boolean;
      additionalWidth: number;
    };

interface FloatingUIContentSignature {
  Element: HTMLDivElement;
  Args: {
    anchor: HTMLElement;
    id: string;
    // TODO: Move null logic to a parent component.
    placement?: Placement | null;
    renderOut?: boolean;
    offset?: OffsetOptions;
    matchAnchorWidth?: MatchAnchorWidthOptions;
  };
  Blocks: {
    default: [];
  };
}

export default class FloatingUIContent extends Component<FloatingUIContentSignature> {
  @tracked _content: HTMLElement | null = null;
  @tracked cleanup: (() => void) | null = null;

  get content() {
    assert("_content must exist", this._content);
    return this._content;
  }

  private offset: OffsetOptions = this.args.offset || 5;

  @action didInsert(e: HTMLElement) {
    this._content = e;

    const { matchAnchorWidth, anchor, placement } = this.args;
    const { content } = this;

    this.maybeMatchAnchorWidth();

    if (placement === null) {
      content.removeAttribute("data-floating-ui-placement");
      content.classList.add("non-floating-content");
      this.cleanup = () => {};
      return;
    }

    const detectOverflowMiddleware = {
      name: "detectOverflow",
      async fn(state: MiddlewareState) {
        const containerWidth = htmlElement(".header-nav").offsetWidth;

        const overflow = await detectOverflow(state, {
          boundary: htmlElement(".header-nav"),
        });
        return {
          data: overflow,
        };
      },
    };

    let updatePosition = async () => {
      let _placement = placement || "bottom-start";

      computePosition(anchor, content, {
        platform,
        placement: placement as Placement,
        middleware: [
          offset(this.offset),
          flip(),
          shift(),
          detectOverflowMiddleware,
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        this.maybeMatchAnchorWidth();

        this.content.setAttribute("data-floating-ui-placement", placement);
        // console.log("x", x);
        // console.log("y", y);
        // console.log("middlewareData", middlewareData["detectOverflow"]);

        const availableSpaceRight = middlewareData["detectOverflow"].right;
        const availableSpaceLeft = middlewareData["detectOverflow"].left;

        let left = x;

        if (availableSpaceRight > 0) {
          left = x - availableSpaceRight;
        } else if (availableSpaceLeft > 0) {
          left = x + availableSpaceLeft;
        }

        Object.assign(this.content.style, {
          left: `${left}px`,
          top: `${y}px`,
        });
      });
    };

    this.cleanup = autoUpdate(anchor, content, updatePosition);
  }

  private maybeMatchAnchorWidth() {
    const { matchAnchorWidth, anchor } = this.args;
    const { content } = this;

    if (!matchAnchorWidth) {
      return;
    }

    if (typeof matchAnchorWidth === "boolean") {
      content.style.width = `${anchor.offsetWidth}px`;
    } else {
      content.style.width = `${
        anchor.offsetWidth + matchAnchorWidth.additionalWidth
      }px`;
    }

    content.style.maxWidth = "none";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "FloatingUI::Content": typeof FloatingUIContent;
  }
}
