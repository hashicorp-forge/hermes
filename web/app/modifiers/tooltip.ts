import Modifier from "ember-modifier";
import { registerDestructor } from "@ember/destroyable";
import { tracked } from "@glimmer/tracking";
import { assert } from "@ember/debug";
import { action } from "@ember/object";
import {
  Placement,
  Side,
  arrow,
  autoUpdate,
  computePosition,
  flip,
  offset,
  platform,
} from "@floating-ui/dom";
import { FOCUSABLE } from "hermes/components/editable-field";
import { guidFor } from "@ember/object/internals";
import htmlElement from "hermes/utils/html-element";

/**
 * A modifier that attaches a tooltip to a reference element on hover or focus.
 *
 * Example usage:
 * <div {{tooltip "Go back"}}>
 *  <FlightIcon @name="arrow-left" />
 * </div>
 *
 * Takes text and an optional named `placement` argument:
 * {{tooltip "Go back" placement="left-end"}}
 *
 * TODO:
 * - Add `renderInPlace` argument
 * - Add animation logic
 */

interface TooltipModifierSignature {
  Args: {
    Element: HTMLElement;
    Positional: [string];
    Named: {
      placement?: Placement;
    };
  };
}

/**
 * Use the `ember-application` container to ensure a consistent parent element
 * in tests as well as in the browser.
 */
let DOM_PARENT = htmlElement(".ember-application");

/**
 * The cleanup function that runs when the modifier is destroyed.
 * Removes the event listeners that were added on `modify`.
 * Called by the `registerDestructor` function.
 */
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
   * A unique ID used to associate the reference and the tooltip.
   * Applied to the reference's `aria-describedby` and the tooltip's `id`.
   * Ensures the tooltip is read by screen readers.
   */
  get id() {
    return guidFor(this);
  }

  /**
   * The text that is displayed in the tooltip.
   */
  @tracked _tooltipText: string | null = null;

  /**
   * The reference element that the tooltip is attached to.
   */
  @tracked _reference: Element | null = null;

  /**
   * The arrow element that is rendered within the tooltip.
   */
  @tracked _arrow: HTMLElement | null = null;

  /**
   * The tooltip element that is rendered in the DOM.
   */
  @tracked tooltip: HTMLElement | null = null;

  /**
   * The placement of the tooltip relative to the reference element.
   * Defaults to `top` but can be overridden by invoking the modifier
   * with a `placement` argument.
   */
  @tracked placement: Placement = "top";

  /**
   * An asserted-to-exist reference to the reference element.
   */
  get reference(): Element {
    assert("reference must exist", this._reference);
    return this._reference;
  }

  /**
   * An asserted-to-exist reference to the tooltip text.
   */
  get tooltipText(): string {
    assert("text must exist", this._tooltipText);
    return this._tooltipText;
  }

  /**
   * An asserted-to-exist reference to the tooltip arrow.
   */
  get arrow(): HTMLElement {
    assert("arrow must exist", this._arrow);
    return this._arrow;
  }

  /**
   * The action that runs on mouseenter and focusin.
   * Creates the tooltip element and adds it to the DOM,
   * positioned relative to the reference element, as
   * calculated by the `floating-ui` positioning library.
   */
  @action showContent() {
    /**
     * Do nothing if the tooltip exists, e.g., if the user
     * hovers a reference that's already focused.
     */
    if (this.tooltip) {
      return;
    }

    /**
     * Create the tooltip and set its attributes
     */
    this.tooltip = document.createElement("div");
    this.tooltip.classList.add("hermes-tooltip");
    this.tooltip.setAttribute("data-tooltip-placement", this.placement);
    this.tooltip.setAttribute("id", `tooltip-${this.id}`);
    this.tooltip.setAttribute("role", "tooltip");

    /**
     * Create the arrow and append it to the tooltip
     */
    this._arrow = document.createElement("div");
    this._arrow.classList.add("arrow");
    this.tooltip.appendChild(this._arrow);

    /**
     * Create the textElement and append it to the tooltip
     */
    const textElement = document.createElement("div");
    textElement.textContent = this.tooltipText;
    textElement.classList.add("text");
    this.tooltip.appendChild(textElement);

    /**
     * Append the tooltip to the end of the DOM
     * TODO: Add the ability to render the tooltip in place
     */
    DOM_PARENT.appendChild(this.tooltip);

    /**
     * The function that calculates, and updates the tooltip's position.
     * Called repeatedly by the `floating-ui` positioning library.
     */
    let updatePosition = async () => {
      if (!this.tooltip) {
        return;
      }

      // https://floating-ui.com/docs/computePosition
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
        /**
         * Position the tooltip
         */
        assert("tooltip must exist", this.tooltip);
        Object.assign(this.tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
        });

        /**
         * Position the tooltip
         *
         * https://floating-ui.com/docs/arrow#usage
         * https://codesandbox.io/s/mystifying-kare-ee3hmh?file=/src/index.js
         */

        const basicTooltipPlacement = this.placement.split("-")[0] as Side;
        const arrowStaticSide = {
          top: "bottom",
          right: "left",
          bottom: "top",
          left: "right",
        }[basicTooltipPlacement] as Side;

        if (middlewareData.arrow) {
          const { x, y } = middlewareData.arrow;
          Object.assign(this.arrow.style, {
            left: x != null ? `${x}px` : "",
            top: y != null ? `${y}px` : "",
            [arrowStaticSide]: `${-this.arrow.offsetWidth / 2}px`,
            transform: "rotate(45deg)",
          });
        }
      });
    };

    // https://floating-ui.com/docs/autoUpdate
    autoUpdate(this.reference, this.tooltip, updatePosition);

    // TODO: Investigate whether we need this cleanup
    const cleanup = autoUpdate(this.reference, this.tooltip, updatePosition);

    registerDestructor(this, cleanup);
  }

  /**
   * The function to run on mouseleave and focusout.
   * Removes the tooltip element from the DOM if it exists
   * and the reference element is not focused.
   */
  @action maybeHideContent() {
    if (this.reference.matches(":focus")) {
      return;
    }

    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  /**
   * The function that runs when the modified element is inserted and updated.
   * Sets up event listeners, local properties and some attributes.
   */
  modify(
    element: Element,
    positional: [string],
    named: {
      placement?: Placement;
    }
  ) {
    this._reference = element;
    this._tooltipText = positional[0];

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

    registerDestructor(this, cleanup);
  }
}
