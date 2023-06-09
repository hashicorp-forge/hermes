// https://helios.hashicorp.design/components/form/checkbox?tab=code#formcheckboxfield-1

import { ComponentLike } from "@glint/template";

interface HdsFormCheckboxFieldComponentSignature {
  Element: HTMLInputElement;
  Args: {
    id?: string;
    extraDescribedBy?: string;
  };
  Blocks: {
    default: [
      F: {
        // TODO: Type these
        Label: any;
        Error: any;
        HelperText: any;
      }
    ];
  }
}

export type HdsFormCheckboxFieldComponent =
  ComponentLike<HdsFormCheckboxFieldComponentSignature>;
