import Ember from "ember";
import { timeout } from "ember-concurrency";

/**
 * Adds a temporary highlight to a relatively positioned element.
 * Used to draw attention to an item, such as a related resource
 * that's been added or modified.
 */

export default async function highlightElement(target: Element) {
  const highlight = document.createElement("div");

  highlight.setAttribute("aria-hidden", "true");
  highlight.classList.add("highlight-affordance");

  target.appendChild(highlight);

  const fadeInAnimation = highlight.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: Ember.testing ? 0 : 50,
    fill: "forwards",
  });

  await timeout(Ember.testing ? 0 : 2000);

  const fadeOutAnimation = highlight.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: Ember.testing ? 0 : 400,
    fill: "forwards",
  });

  try {
    await fadeInAnimation.finished;
    await fadeOutAnimation.finished;
  } finally {
    fadeInAnimation.cancel();
    fadeOutAnimation.cancel();
    highlight.remove();
  }
}
