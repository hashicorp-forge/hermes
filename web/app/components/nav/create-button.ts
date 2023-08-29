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
        shortName: "RFC",
        description: "Ask colleagues for feedback on a proposal.",
      },
      {
        label: "Product requirements",
        shortName: "PRD",
        description: "Plan a new product or feature.",
      },
      {
        label: "Funding request",
        shortName: "FRD",
        description: "Get buy-in for your project's budget.",
      },
      {
        label: "Plan of record",
        shortName: "POR",
        description: "Set goals and milestones for an initiative.",
      },
      {
        label: "Memo",
        shortName: "MEMO",
        description: "Share freeform info with your team.",
      },
      {
        label: "Press release / FAQ",
        shortName: "PRFAQ",
        description: "Write a press release for your project.",
      },
    ];
  }

  protected get menuItems() {
    const projectItem = {
      label: "Project",
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
