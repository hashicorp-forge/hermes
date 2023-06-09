// https://helios.hashicorp.design/components/toast?tab=code#component-api

import { ComponentLike } from "@glint/template";
import { HdsAlertComponent } from "./alert";

interface HdsToastComponentSignature {
  Element: HTMLDivElement;
  Args: HdsAlertComponent["Args"];
  Blocks: HdsAlertComponent["Blocks"];
}

export type HdsToastComponent = ComponentLike<HdsToastComponentSignature>;
