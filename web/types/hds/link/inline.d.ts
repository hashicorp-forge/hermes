// https://helios.hashicorp.design/components/link/inline?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsAnchorComponentArgs,
  HdsIconPosition,
  HdsLinkColor,
} from "hds/_shared";

export interface HdsLinkComponentSignature {
  Element: HTMLAnchorElement;
  Args: HdsAnchorComponentArgs & {
    color?: HdsLinkColor;
  };
  Blocks: {
    default: [];
  };
}

export type HdsLinkInlineComponent = ComponentLike<HdsLinkComponentSignature>;
