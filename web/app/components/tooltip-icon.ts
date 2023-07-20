import Component from "@glimmer/component";

interface TooltipIconComponentSignature {
  Element: HTMLSpanElement;
  Args: {
    text: string;
    icon?: string;
  };
}

export default class TooltipIconComponent extends Component<TooltipIconComponentSignature> {
  protected get icon(): string {
    return this.args.icon ?? "help";
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    TooltipIcon: typeof TooltipIconComponent;
  }
}
