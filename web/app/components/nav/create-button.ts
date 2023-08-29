import Component from "@glimmer/component";

interface NavNewCreateButtonSignature {
  Element: HTMLButtonElement;
  Args: {};
}

export default class NavNewCreateButton extends Component<NavNewCreateButtonSignature> {
  private get docTypes() {
    return [
      {
        label: "Request for comments",
        icon: "discussion-circle",
        shortName: "RFC",
        description: "Ask colleagues for feedback on a proposal.",
      },
      {
        label: "Product requirements",
        icon: "target",
        shortName: "PRD",
        description: "Plan a new product or feature.",
      },
      {
        label: "Funding request",
        icon: "dollar-sign",
        shortName: "FRD",
        description: "Get buy-in for your project's budget.",
      },
      {
        label: "Plan of record",
        icon: "map",
        shortName: "POR",
        description: "Set goals and milestones for an initiative.",
      },
      {
        label: "Press release / FAQ",
        icon: "newspaper",
        shortName: "PRFAQ",
        description: "Write a press release for your project.",
      },
      {
        label: "Memo",
        icon: "radio",
        shortName: "MEMO",
        description: "Share freeform info with your team.",
      },
    ];
  }

  protected get menuItems() {
    const projectItem = {
      label: "Start a project",
      shortName: "PROJECT",
      description: "Create a new project.",
    };

    return { ...this.docTypes, projectItem };
  }
}

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "Nav::CreateButton": typeof NavNewCreateButton;
  }
}
