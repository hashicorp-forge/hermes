// https://helios.hashicorp.design/components/button?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsButtonColor,
  HdsIconPosition,
  HdsComponentSize,
  HdsAnchorComponentArgs,
} from "hds/_shared";

interface HdsButtonComponentSignature {
  Element: HTMLButtonElement;
  Args: HdsAnchorComponentArgs & {
    text: string;
    size?: HdsComponentSize;
    color?: HdsButtonColor;
    isIconOnly?: boolean;
    isFullWidth?: boolean;
    isRouteExternal?: boolean;
  };
}

export type HdsButtonComponent = ComponentLike<HdsButtonComponentSignature>;
