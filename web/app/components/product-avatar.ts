import Component from "@glimmer/component";
import { HermesDocument } from "hermes/types/document";
import fontColorContrast from "font-color-contrast";

interface ProductAvatarComponentSignature {
  Element: HTMLDivElement;
  Args: {
    doc?: HermesDocument;
    bgColor?: string;
  };
  Blocks: {
    default: [];
  };
}

export default class ProductAvatarComponent extends Component<ProductAvatarComponentSignature> {
  get style() {
    const bgColor = this.args.bgColor || "#777";
    let textColor = fontColorContrast(bgColor);

    // TODO: consider changing #000000 to something else

    return `
      background-image: none;
      background-color:${bgColor};
      color: ${textColor};
    `;
  }
}
declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    ProductAvatar: typeof ProductAvatarComponent;
  }
}
