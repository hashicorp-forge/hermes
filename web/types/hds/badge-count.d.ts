//helios.hashicorp.design/components/badge-count?tab=code#component-api

import { ComponentLike } from "@glint/template";
import { HdsBadgeCountColor, HdsBadgeType } from "hds/_shared";
import { HdsBadgeCountSize } from "hermes/types/HdsBadgeCountSize";

interface HdsBadgeCountComponentSignature {
  Element: HTMLDivElement;
  Args: {
    text: string;
    size?: HdsBadgeCountSize;
    type?: HdsBadgeType;
    color?: HdsBadgeCountColor;
  };
}

export type HdsBadgeCountComponent =
  ComponentLike<HdsBadgeCountComponentSignature>;
