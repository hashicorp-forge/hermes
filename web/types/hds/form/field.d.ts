// https://helios.hashicorp.design/components/form/primitives?tab=code#formfield-1

import { ComponentLike } from "@glint/template";
import { HdsFormFieldLayout } from "hds/_shared";

interface HdsFormFieldComponentSignature {
  Element: HTMLDivElement;
  Args: {
    layout?: HdsFormFieldLayout;
    id?: string;
    extraDescribedBy?: string;
    isRequired?: boolean;
    isOptional?: boolean;
  };
  Blocks: {
    default: [
      F: {
        // TODO: Type these
        Label: any;
        HelperText: any;
        Error: any;
        Control: any;
      }
    ];
  };
}

export type HdsFormFieldComponent =
  ComponentLike<HdsFormFieldComponentSignature>;
