// helios.hashicorp.design/components/badge-count?tab=code#component-api

declare module "@hashicorp/design-system-components/components/hds/badge-count" {
  import Component from "@glimmer/component";
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
  export default class HdsBadgeCount extends Component<HdsBadgeCountComponentSignature> {}
}
