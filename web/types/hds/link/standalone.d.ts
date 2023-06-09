// https://helios.hashicorp.design/components/link/standalone?tab=code#component-api

import { ComponentLike } from "@glint/template";
import { HdsLinkComponentSignature } from "./inline";
import { HdsComponentSize } from "hds/_shared";

interface HdsLinkStandaloneComponentSignature {
  Element: HdsLinkComponentSignature["Element"];
  Args: HdsLinkComponentSignature["Args"] & {
    text: string;
    size?: HdsComponentSize;
  };
  Blocks: HdsLinkComponentSignature["Blocks"];
}

export type HdsLinkStandaloneComponent =
  ComponentLike<HdsLinkStandaloneSignature>;
