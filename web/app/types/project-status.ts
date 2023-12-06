export enum ProjectStatus {
  Active = "active",
  Completed = "completed",
  Archived = "archived",
}

export const projectStatusObjects: Record<ProjectStatus, { label: string }> = {
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
