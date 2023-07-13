/**
 * Scrolls an element into view if it is not
 * already visible within its container.
 */
export default function maybeScrollIntoView(
  target: HTMLElement,
  container: HTMLElement,
  measuringPreference:
    | "offsetHeight"
    | "getBoundingClientRect" = "offsetHeight",
  bottomPadding: number = 0
): void {
  const useBoundingClientRect = measuringPreference === "getBoundingClientRect";

  const containerHeight = container.offsetHeight;
  const targetHeight = target.offsetHeight;

  let targetTop = target.offsetTop;

  if (useBoundingClientRect) {
    targetTop = target.getBoundingClientRect().top;
  }

  const targetBottom = targetTop + targetHeight;
  const scrollViewTop = container.scrollTop;
  const scrollViewBottom = scrollViewTop + containerHeight;

  if (targetBottom > scrollViewBottom) {
    container.scrollTop =
      targetTop + targetHeight - containerHeight + bottomPadding;
  } else if (targetTop < scrollViewTop) {
    container.scrollTop = targetTop;
  }
}
