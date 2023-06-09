// https://helios.hashicorp.design/components/form/toggle?tab=code#formtogglebase-1

import { ComponentLike } from "@glint/template";

interface HdsFormToggleBaseComponentSignature {
  Element: HTMLInputElement;
  Args: {};
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

export type HdsFormToggleBaseComponent =
  ComponentLike<HdsFormToggleBaseComponentSignature>;
