import { helper } from "@ember/component/helper";
import htmlElement from "hermes/utils/html-element";

interface HtmlElementHelperSignature {
  Args: {
    Positional: [selector: string];
  };
  Return: HTMLElement;
}

const htmlElementHelper = helper<HtmlElementHelperSignature>(
  ([selector]: [string]) => {
    return htmlElement(selector);
  }
);

export default htmlElementHelper;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "html-element": typeof htmlElementHelper;
  }
}
