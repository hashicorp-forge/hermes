// https://helios.hashicorp.design/components/modal?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsComponentSize,
  HdsIconPosition,
  HdsLinkColor,
  HdsModalColor,
} from "hds/_shared";

export interface HdsModalComponentSignature {
  Element: HTMLDialogElement;
  Args: {
    size?: HdsComponentSize;
    color?: HdsModalColor;
    onOpen?: () => void;
    onClose?: () => void;
    isDismissDisabled?: boolean;
  };
  Blocks: {
    default: [
      M: {
        // TODO: Type these
        Header: any;
        Body: any;
        Footer: any;
      }
    ];
  };
}

export type HdsModalComponent = ComponentLike<HdsModalComponentSignature>;
