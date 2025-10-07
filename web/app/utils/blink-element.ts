import { isTesting } from "@embroider/macros";

/**
 * Blinks an element twice by toggling its visibility.
 * Used for emphasis, such as to reiterate an
 * already-visible form error.
 */
const DURATION = isTesting() ? 0 : 100;

export default function blinkElement(element?: Element | null) {
  if (!element) {
    return;
  }

  for (let i = 0; i < 4; i++) {
    // Alternate between hidden and visible
    let visibility = i % 2 === 0 ? "hidden" : "visible";

    setTimeout(() => {
      if (element) {
        element.setAttribute("style", `visibility: ${visibility}`);
      }
    }, i * DURATION);
  }
}
