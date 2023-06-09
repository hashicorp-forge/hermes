// https://helios.hashicorp.design/components/form/text-input?tab=code#formtextinputbase-1
import { ComponentLike } from "@glint/template";
import { HdsFormTextInputArgs } from ".";

export interface HdsFormTextInputBaseComponentSignature {
  Element: HTMLInputElement;
  Args: {
    type: string;
    value: string | number | Date;
    isInvalid?: boolean;
    width?: string;
  };
}

export type HdsFormTextInputBaseComponent =
  ComponentLike<HdsFormTextInputBaseComponentSignature>;
