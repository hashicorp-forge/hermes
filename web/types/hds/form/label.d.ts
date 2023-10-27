// https://helios.hashicorp.design/components/form/primitives?tab=code#formlabel-2

import { ComponentLike } from "@glint/template";

interface HdsFormLabelComponentSignature {
  Element: HTMLLabelElement;
  Args: {
    controlId?: string;
    isRequired?: boolean;
    isOptional?: boolean;
  };
  Blocks: {
    default: [];
  };
}

export type HdsFormLabelComponent =
  ComponentLike<HdsFormLabelComponentSignature>;
