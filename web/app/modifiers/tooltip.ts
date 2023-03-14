import Modifier, { ArgsFor } from "ember-modifier";
import { registerDestructor } from "@ember/destroyable";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { action } from "@ember/object";
import {
  Placement,
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  platform,
} from "@floating-ui/dom";

import { FOCUSABLE } from "hermes/components/editable-field";
import { guidFor } from "@ember/object/internals";

interface TooltipModifierSignature {
  Args: {
    Element: HTMLElement;
    Positional: [string];
    Named: {
      placement?: Placement;
    };
  };
}

function cleanup(instance: TooltipModifier) {
  instance.reference.removeEventListener("focusin", instance.showContent);
  instance.reference.removeEventListener("focusout", instance.maybeHideContent);
  instance.reference.removeEventListener("mouseenter", instance.showContent);
  instance.reference.removeEventListener(
    "mouseleave",
    instance.maybeHideContent
  );
}

export default class TooltipModifier extends Modifier<TooltipModifierSignature> {
  /**
   * Register the cleanup function for when the modifier is destroyed.
   */
  constructor(owner: any, args: ArgsFor<TooltipModifierSignature>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

  get id() {
    return guidFor(this);
  }

  @tracked _text: string | null = null;
  @tracked _reference: Element | null = null;
  @tracked _tooltip: HTMLElement | null = null;
  @tracked _arrow: HTMLElement | null = null;

  @tracked placement: Placement = "top";

  get tooltip(): HTMLElement {
    assert("tooltip must exist", this._tooltip);
    return this._tooltip;
  }

  get arrow(): HTMLElement {
    assert("arrow must exist", this._arrow);
    return this._arrow;
  }

  get reference(): Element {
    assert("reference must exist", this._reference);
    return this._reference;
  }

  get text(): string {
    assert("text must exist", this._text);
    return this._text;
  }

  @action showContent() {
    if (this._tooltip) {
      return;
    }

    this._tooltip = document.createElement("div");
    this._tooltip.classList.add("hermes-tooltip");
    this._tooltip.setAttribute("role", "tooltip");
    this._tooltip.setAttribute("id", `tooltip-${this.id}`);

    this._arrow = document.createElement("div");
    this._arrow.classList.add("arrow");

    this._tooltip.appendChild(this._arrow);

    const textElement = document.createElement("div");

    textElement.classList.add("text");
    textElement.textContent = this.text;

    this._tooltip.appendChild(textElement);

    document.body.appendChild(this._tooltip);

    let updatePosition = async () => {
      computePosition(this.reference, this.tooltip, {
        platform: platform,
        placement: this.placement,
        middleware: [
          offset(8),
          flip(),
          arrow({
            element: this.arrow,
          }),
        ],
      }).then(({ x, y, middlewareData }) => {
        Object.assign(this.tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
        });

        // https://floating-ui.com/docs/arrow#usage

        const side = this.placement.split("-")[0];
        assert("side must exist", side);

        const staticSide = {
          top: "bottom",
          right: "left",
          bottom: "top",
          left: "right",
        }[side];
        assert("staticSide must exist", staticSide);

        if (middlewareData.arrow) {
          const { x, y } = middlewareData.arrow;
          Object.assign(this.arrow.style, {
            left: x != null ? `${x}px` : "",
            top: y != null ? `${y}px` : "",
            [staticSide]: `${-this.arrow.offsetWidth / 2}px`,
            transform: "rotate(45deg)",
          });
        }
      });
    };

    updatePosition();

    const cleanup = autoUpdate(this.reference, this.tooltip, updatePosition);

    registerDestructor(this, cleanup);
  }

  @action maybeHideContent() {
    if (this.reference.matches(":focus")) {
      return;
    }

    if (this._tooltip) {
      this._tooltip.remove();
      this._tooltip = null;
    }
  }

  /**
   * The function that runs when the modified element is shown.
   * Sets up the event listeners and stores the properties locally.
   */
  modify(
    element: Element,
    positional: [string],
    named: {
      placement?: Placement;
    }
  ) {
    this._reference = element;
    this._text = positional[0];

    if (named.placement) {
      this.placement = named.placement;
    }

    this._reference.setAttribute("aria-describedby", `tooltip-${this.id}`);

    if (!this._reference.matches(FOCUSABLE)) {
      this._reference.setAttribute("tabindex", "0");
    }

    this._reference.addEventListener("focusin", this.showContent);
    this._reference.addEventListener("mouseenter", this.showContent);
    this._reference.addEventListener("focusout", this.maybeHideContent);
    this._reference.addEventListener("mouseleave", this.maybeHideContent);
  }
}
