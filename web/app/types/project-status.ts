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

export const COLOR_BG_ACTIVE = "var(--token-color-palette-purple-100)";
export const COLOR_OUTLINE_ACTIVE = "var(--token-color-palette-purple-200)";
export const COLOR_ICON_ACTIVE = "var(--token-color-palette-purple-400)";

export const COLOR_BG_COMPLETED = "var(--token-color-palette-green-100)";
export const COLOR_OUTLINE_COMPLETED = "var(--token-color-palette-green-200)";
export const COLOR_ICON_COMPLETED = "var(--token-color-palette-green-300)";

export const COLOR_BG_ARCHIVED = "var(--token-color-palette-neutral-200)";
export const COLOR_OUTLINE_ARCHIVED = "var(--token-color-palette-neutral-400)";
