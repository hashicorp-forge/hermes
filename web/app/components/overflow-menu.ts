import type { OffsetOptions } from "@floating-ui/dom";
import Component from "@glimmer/component";

export interface OverflowItem {
  label: string;
  icon: string;
  action: any;
}

interface OverflowMenuComponentSignature {
  Element: HTMLDivElement;
  Args: {
    items: Record<string, OverflowItem>;
    offset?: OffsetOptions;
    isShown?: boolean;
    renderOut?: boolean;
  };
}

export default class OverflowMenuComponent extends Component<OverflowMenuComponentSignature> {}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    OverflowMenu: typeof OverflowMenuComponent;
  }
}
