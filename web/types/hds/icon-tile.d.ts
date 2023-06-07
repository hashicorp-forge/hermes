// https://helios.hashicorp.design/components/icon-tile?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsComponentSize,
  HdsIconTileColor,
  HdsProductLogoName,
} from "hds/_shared";

interface HdsIconTileComponentSignature {
  Element: HTMLDivElement;
  Args: {
    size?: HdsComponentSize;
    logo?: HdsProductLogoName;
    icon?: string;
    iconSecondary?: string;
    color?: HdsIconTileColor;
  };
}

export type HdsIconTileComponent = ComponentLike<HdsIconTileComponentSignature>;
