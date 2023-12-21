export enum ProjectStatus {
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

export type ProjectStatusObject = {
  label: string;
  icon: string;
};

export const projectStatusObjects: Record<ProjectStatus, ProjectStatusObject> =
  {
    [ProjectStatus.Active]: {
      label: "Active",
      icon: "zap",
    },
    [ProjectStatus.Completed]: {
      label: "Completed",
      icon: "check-circle",
    },
    [ProjectStatus.Archived]: {
      label: "Archived",
      icon: "archive",
    },
  };
