// https://helios.hashicorp.design/components/form/text-input?tab=code#formtextinputfield-1

import { ComponentLike } from "@glint/template";
import { HdsFormTextInputBaseSignature } from "./base";

interface HdsFormTextInputFieldComponentSignature {
  Element: HdsFormTextInputBaseComponentSignature["Element"];
  Args: HdsFormTextInputBaseComponentSignature["Args"] & {
    isRequired?: boolean;
    isOptional?: boolean;
    id?: string;
    extraAriaDescribedBy?: string;
  };
  Blocks: {
    default: [
      F: {
        // TODO: Type these
        Label: any;
        HelperText: any;
        Error: any;
      }
    ];
  };
}

export type HdsFormTextInputFieldComponent =
  ComponentLike<HdsFormTextInputFieldComponentSignature>;
