import Modifier, { ArgsFor } from "ember-modifier";
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
  shift,
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
 * The cleanup function that runs when the modifier is destroyed.
 * Removes the event listeners that were added on `modify`.
 * Called by the `registerDestructor` function.
 */
function cleanup(instance: TooltipModifier) {
  document.removeEventListener("keydown", instance.handleKeydown);
  instance.reference.removeEventListener("click", instance.handleClick);
  instance.reference.removeEventListener("focusin", instance.onFocusIn);
  instance.reference.removeEventListener("focusout", instance.maybeHideContent);
  instance.reference.removeEventListener("mouseenter", instance.showContent);
  instance.reference.removeEventListener(
    "mouseleave",
    instance.maybeHideContent
  );

  if (instance.floatingUICleanup) {
    instance.floatingUICleanup();
  }

  if (instance.tooltip) {
    instance.tooltip.remove();
  }
}

export default class TooltipModifier extends Modifier<TooltipModifierSignature> {
  constructor(owner: any, args: ArgsFor<TooltipModifierSignature>) {
    super(owner, args);
    registerDestructor(this, cleanup);
  }

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

  @tracked stayOpenOnClick = false;

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

  @tracked floatingUICleanup: (() => void) | null = null;

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
     * Append the tooltip to the end of the document.
     * We use the `ember-application` selector to ensure
     * a consistent cross-environment parent;
     *
     * TODO: Add the ability to render the tooltip in place
     */
    htmlElement(".ember-application").appendChild(this.tooltip);

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
          shift(),
          arrow({
            element: this.arrow,
            padding: 10,
          }),
        ],
      }).then(({ x, y, placement, middlewareData }) => {
        if (!this.tooltip) {
          return;
        }

        /**
         * Update and set the tooltip's placement attribute
         * based on the calculated placement (which could differ from
         * the named argument passed to the modifier)
         */
        this.placement = placement;
        this.tooltip.setAttribute("data-tooltip-placement", this.placement);

        /**
         * Position the tooltip
         */
        Object.assign(this.tooltip.style, {
          left: `${x}px`,
          top: `${y}px`,
        });

        /**
         * Position the arrow
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
            /**
             * Ensure the static side gets unset when
             * flipping to other placements' axes.
             */
            right: "",
            bottom: "",
            [arrowStaticSide]: `${-this.arrow.offsetWidth / 2}px`,
            transform: "rotate(45deg)",
          });
        }
      });
    };

    this.floatingUICleanup = autoUpdate(
      this.reference,
      this.tooltip,
      updatePosition
    );
  }

  /**
   * A click listener added in the `modify` hook that hides the tooltip
   * unless it's specifically configured to stay open on click.
   */
  @action handleClick() {
    if (!this.stayOpenOnClick) {
      this.maybeHideContent();
    }
  }

  /**
   * Action that runs on document.keydown. Hides the tooltip on `Escape`.
   */
  @action handleKeydown(event: KeyboardEvent) {
    if (this.tooltip && event.key === "Escape") {
      this.hideContent();
    }
  }

  /**
   * Updates the tooltip's text content if it exists and needs updating.
   * Called in the `modify` hook to capture any text changes,
   * e.g., "Copy" -> "Copied!", "Expand" -> "Collapse"
   */
  @action maybeUpdateTooltipText() {
    if (this.tooltip) {
      let text = this.tooltip.querySelector(".text");
      if (text && text.textContent !== this.tooltipText) {
        text.textContent = this.tooltipText;
      }
      return;
    }
  }

  /**
   * The action that runs on focusin. Opens the tooltip if the reference
   * is `focus-visible`. We check this to prevents the tooltip from opening when the
   * reference is indeed focused, but not via keyboard, e.g., when clicking on a button.
   * This specifically targets a case where switching windows and returning would reopen
   * the tooltip if a previously clicked reference remained focused.
   */
  @action onFocusIn() {
    if (this.reference.matches(":focus-visible")) {
      this.showContent();
    }
  }

  /**
   * The function to run on mouseleave and focusout.
   * Removes the tooltip element from the DOM if it exists
   * and the reference element is not focus-visible.
   */
  @action maybeHideContent() {
    if (this.reference.matches(":focus-visible")) {
      return;
    }
    if (this.tooltip) {
      this.hideContent();
    }
  }

  @action hideContent() {
    assert("tooltip expected", this.tooltip);
    this.tooltip.remove();
    this.tooltip = null;
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
      stayOpenOnClick?: boolean;
    }
  ) {
    this._reference = element;
    this._tooltipText = positional[0];

    this.maybeUpdateTooltipText();

    if (named.placement) {
      this.placement = named.placement;
    }

    if (named.stayOpenOnClick) {
      this.stayOpenOnClick = named.stayOpenOnClick;
    }

    this._reference.setAttribute("aria-describedby", `tooltip-${this.id}`);

    /**
     * If the reference isn't inherently focusable, make it focusable.
     */
    if (!this._reference.matches(FOCUSABLE)) {
      this._reference.setAttribute("tabindex", "0");
    }

    document.addEventListener("keydown", this.handleKeydown);
    this._reference.addEventListener("click", this.handleClick);
    this._reference.addEventListener("focusin", this.onFocusIn);
    this._reference.addEventListener("mouseenter", this.showContent);
    this._reference.addEventListener("focusout", this.maybeHideContent);
    this._reference.addEventListener("mouseleave", this.maybeHideContent);
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    tooltip: typeof TooltipModifier;
  }
}
