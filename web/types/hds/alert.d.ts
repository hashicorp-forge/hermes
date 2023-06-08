// https://helios.hashicorp.design/components/alert?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsButtonColor,
  HdsIconPosition,
  HdsComponentSize,
  HdsAlertColor,
} from "hds/_shared";

interface HdsAlertComponentSignature {
  Element: HTMLDivElement;
  Args: {
    type: "page" | "inline" | "compact";
    color?: HdsAlertColor;
    icon?: string | false;
    onDismiss?: () => void;
  };
  Blocks: {
    default: [
      A: {
        // TODO: Type these
        Title: any;
        Description: any;
        Button: any;
        "Link::Standalone": any;
        Generic: any;
      }
    ];
  };
}

export type HdsAlertComponent = ComponentLike<HdsAlertComponentSignature>;
