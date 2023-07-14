// https://helios.hashicorp.design/components/card?tab=code#component-api

import { ComponentLike } from "@glint/template";
import { HdsCardBackgroundColor, HdsComponentOverflow, HdsComponentShadowLevel } from "hds/_shared";

interface HdsCardContainerComponentSignature {
  Element: HTMLDivElement;
  Args: {
    level?: HdsComponentShadowLevel;
    levelHover?: HdsComponentShadowLevel;
    levelActive?: HdsComponentShadowLevel;
    background?: HdsCardBackgroundColor;
    hasBorder?: boolean;
    overflow?: HdsComponentOverflow;
  };
  Blocks: {
    default: [];
  }
}

export type HdsCardContainerComponent =
  ComponentLike<HdsCardContainerComponentSignature>;
