// declare module "@hashicorp/design-system-components/components/badge" {
import { ComponentLike } from "@glint/template";
// import Component from "@glimmer/component";
import { HdsBadgeColor, HdsBadgeType, HdsComponentSize } from "hds/_shared";

// https://helios.hashicorp.design/components/badge?tab=code#component-api

interface HdsBadgeComponentSignature {
  Element: HTMLDivElement;
  Args: {
    text: string;
    color?: HdsBadgeColor;
    type?: HdsBadgeType;
    size?: HdsComponentSize;
    icon?: string;
    isIconOnly?: boolean;
  };
}

export type HdsBadgeComponent = ComponentLike<HdsBadgeComponentSignature>;
// export default class HdsBadge extends Component<HdsBadgeComponentSignature> {}
// }
