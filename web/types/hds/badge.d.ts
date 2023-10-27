// declare module "@hashicorp/design-system-components/components/badge" {
import { ComponentLike } from "@glint/template";
import { HdsBadgeColor, HdsBadgeType, HdsComponentSize } from "hds/_shared";

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
