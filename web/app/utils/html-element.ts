import { assert } from "@ember/debug";

export default function htmlElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  assert(
    "selector target must be an HTMLElement",
    element instanceof HTMLElement
  );
  return element;
}
