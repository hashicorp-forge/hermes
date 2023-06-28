// https://helios.hashicorp.design/components/toast?tab=code#component-api

import { ComponentLike } from "@glint/template";
import {
  HdsBadgeColor,
  HdsBadgeType,
  HdsComponentSize,
} from "hermes/enums/hds-components";

interface HdsBadgeComponentSignature {
  Element: HTMLDivElement;
  Args: {
    color?: HdsBadgeColor;
    type?: HdsBadgeType;
    size?: HdsComponentSize;
    text?: string;
    icon?: string;
    isIconOnly?: boolean;
  };
}

export type HdsBadgeComponent = ComponentLike<HdsBadgeComponentSignature>;
