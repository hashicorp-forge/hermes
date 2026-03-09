export enum ProjectStatus {
  Active = "active",
  Completed = "completed", 
  Archived = "archived",
}

export interface HermesProjectInfo {
  id: string;
  title: string;
  status: ProjectStatus;
  description?: string;
  jiraIssueID?: string;
  creator: string;
  createdTime: number;
  modifiedTime: number;
  products?: string[];
}

export interface HermesProject extends HermesProjectInfo {
  // Additional fields can be added here if needed
}

// Color constants for project status icons (matching web app)
export const PROJECT_COLORS = {
  active: {
    bg: '#f4f0ff',      // light purple
    outline: '#d1c4e9',  // purple outline  
    icon: '#9c27b0',     // purple icon
  },
  completed: {
    bg: '#e8f5e8',      // light green
    outline: '#c8e6c8',  // green outline
    icon: '#4caf50',     // green icon
  },
  archived: {
    bg: '#f5f5f5',      // light gray
    outline: '#e0e0e0',  // gray outline
    icon: '#757575',     // gray icon
  },
};