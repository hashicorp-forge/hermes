import { timeout } from "ember-concurrency";

/**
 * Adds a temporary highlight to a relatively positioned element.
 * Used to draw attention to an item, such as a project resource
 * that's been edited.
 */

export default async function highlightElement(target: Element) {
  const highlight = document.createElement("div");

  highlight.setAttribute("aria-hidden", "true");
  // highlight.style.zIndex = "100";
  highlight.classList.add("highlight-affordance");

  target.appendChild(highlight);

  let duration = 50;

  highlight.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration,
    fill: "forwards",
  });

  await timeout(2000 + duration);

  duration = 400;

  highlight.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration,
    fill: "forwards",
  });

  await timeout(duration);

  highlight.remove();
}
