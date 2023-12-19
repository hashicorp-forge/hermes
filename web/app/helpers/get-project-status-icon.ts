import { helper } from "@ember/component/helper";
import {
  ProjectStatus,
  projectStatusObjects,
} from "hermes/types/project-status";

export interface GetProjectStatusIconSignature {
  Args: {
    Positional: [string | undefined];
  };
  Return: string | undefined;
}

const getProjectStatusIcon = helper<GetProjectStatusIconSignature>(
  ([status]) => {
    switch (status) {
      case ProjectStatus.Active:
        return projectStatusObjects[ProjectStatus.Active].icon;
      case ProjectStatus.Completed:
        return projectStatusObjects[ProjectStatus.Completed].icon;
      case ProjectStatus.Archived:
        return projectStatusObjects[ProjectStatus.Archived].icon;
      default:
        return;
    }
  },
);

export default getProjectStatusIcon;

declare module "@glint/environment-ember-loose/registry" {
  export default interface Registry {
    "get-project-status-icon": typeof getProjectStatusIcon;
  }
}
