import Component from "@glimmer/component";

interface NavNewCreateButtonTwoSignature {
  Element: HTMLButtonElement;
  Args: {};
}

export default class NavNewCreateButtonTwo extends Component<NavNewCreateButtonTwoSignature> {
  protected get menuItems() {
    return [
      {
        label: "Document",
        icon: "file-text",
        shortName: "RFC",
        description: "Ask colleagues for feedback on a proposal.",
        route: "authenticated.new.doc",
      },
      {
        label: "Project",
        icon: "grid",
        shortName: "PRD",
        description: "Plan a new product or feature.",
        route: "authenticated.new.project",
      },
    ];
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Nav::CreateButtonTwo": typeof NavNewCreateButtonTwo;
  }
}
