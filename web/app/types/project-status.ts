export enum ProjectStatus {
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

export const projectStatusObjects: Record<
  ProjectStatus,
  { label: string; icon: string }
> = {
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
