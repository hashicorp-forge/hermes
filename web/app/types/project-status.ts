export enum ProjectStatus {
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

export type ProjectStatusObject = {
  label: string;
};

export const projectStatusObjects: Record<ProjectStatus, ProjectStatusObject> =
  {
    [ProjectStatus.Active]: {
      label: "Active",
    },
    [ProjectStatus.Completed]: {
      label: "Completed",
    },
    [ProjectStatus.Archived]: {
      label: "Archived",
    },
  };
