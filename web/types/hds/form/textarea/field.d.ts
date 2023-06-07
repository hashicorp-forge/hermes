// https://helios.hashicorp.design/components/form/textarea?tab=code#formtextareafield-1

import { ComponentLike } from "@glint/template";

interface HdsFormTextareaFieldComponentSignature {
  Element: HTMLTextAreaElement;
  Args: {
    id?: string;
    isInvalid?: boolean;
    isRequired?: boolean;
    isOptional?: boolean;
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

export type HdsFormTextareaFieldComponent =
  ComponentLike<HdsFormTextareaFieldComponentSignature>;
