/**
 * A `scrollIntoView` wrapper with default options.
 * https://github.com/scroll-into-view/compute-scroll-into-view?tab=readme-ov-file#api
 */

import scrollIntoView from "scroll-into-view-if-needed";

export default function scrollIntoViewIfNeeded(
  element: Element,
  options?: ScrollIntoViewOptions,
): void {
  scrollIntoView(element, {
    scrollMode: "if-needed",
    block: "start",
    inline: "nearest",
    ...options,
  });
}
