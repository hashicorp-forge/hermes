// https://helios.hashicorp.design/components/button-set?tab=code#component-api

import { ComponentLike } from "@glint/template";

interface HdsButtonSetComponentSignature {
  Element: HTMLDivElement;
  Args: {};
}

export type HdsButtonSetComponent =
  ComponentLike<HdsButtonSetComponentSignature>;
