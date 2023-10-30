import { helper } from "@ember/component/helper";

export interface GetProjectStatusIconSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string | undefined;
}

const getProjectStatusIcon = helper<GetProjectStatusIconSignature>(
  ([status]) => {
    switch (status) {
      case "active":
        return "circle-dot";
      case "completed":
        return "check-circle";
      case "archived":
        return "archive";
      default:
        return undefined;
    }
  },
);

export default getProjectStatusIcon;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-project-status-icon": typeof getProjectStatusIcon;
  }
}
