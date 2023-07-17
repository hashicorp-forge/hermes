// https://helios.hashicorp.design/components/form/primitives?tab=code#formerror-1

import { ComponentLike } from "@glint/template";
import { HdsFormTextInputArgs } from ".";

export interface HdsFormErrorComponentSignature {
  // Only the default invocation is typed.
  // We'll add the multiple-messages types if we need them.
  Element: HTMLDivElement;
  Args: {
    controlID?: string;
  };
  Blocks: {
    default: [];
  };
}

export type HdsFormErrorComponent =
  ComponentLike<HdsFormErrorComponentSignature>;
