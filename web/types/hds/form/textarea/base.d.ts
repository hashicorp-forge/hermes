// https://helios.hashicorp.design/components/form/text-input?tab=code#formtextinputbase-1

import { ComponentLike } from "@glint/template";

export interface HdsFormTextareaBaseComponentSignature {
  Element: HTMLTextAreaElement;
  Args: {
    value: string;
  };
}

export type HdsFormTextareaBaseComponent =
  ComponentLike<HdsFormTextareaBaseComponentSignature>;
