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

interface FloatingUIContentSignature {
  Element: HTMLDivElement;
  Args: {
    anchor: HTMLElement;
    id: string;
    // TODO: Move null logic to a parent component.
    placement?: Placement | null;
    renderOut?: boolean;
    offset?: OffsetOptions;
    matchAnchorWidth?: boolean;
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
    if (this.args.matchAnchorWidth) {
      this.content.style.width = `${this.args.anchor.offsetWidth}px`;
    }

    if (this.args.placement === null) {
      this.content.removeAttribute("data-floating-ui-placement");
      this.content.classList.add("non-floating-content");
      this.cleanup = () => {};
      return;
    }

    const detectOverflowMiddleware = {
      name: "detectOverflow",
      async fn(state: MiddlewareState) {
        const containerWidth = htmlElement(".header-nav").offsetWidth;

        console.log("containerWidth", containerWidth);
        const overflow = await detectOverflow(state, {
          boundary: htmlElement(".header-nav"),
        });
        return {
          data: overflow,
        };
      },
    };

    let updatePosition = async () => {
      let placement = this.args.placement || "bottom-start";

      computePosition(this.args.anchor, this.content, {
        platform,
        placement: placement as Placement,
        middleware: [
          offset(this.offset),
          flip(),
          shift(),
          detectOverflowMiddleware,
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        this.content.setAttribute("data-floating-ui-placement", placement);
        console.log("x", x);
        console.log("y", y);
        console.log("middlewareData", middlewareData["detectOverflow"]);

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

    this.cleanup = autoUpdate(this.args.anchor, this.content, updatePosition);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "FloatingUI::Content": typeof FloatingUIContent;
  }
}
