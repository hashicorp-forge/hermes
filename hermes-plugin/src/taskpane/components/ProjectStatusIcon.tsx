import * as React from "react";
import { makeStyles, mergeClasses } from "@fluentui/react-components";
import { ProjectStatus, PROJECT_COLORS } from "../interfaces/project";

const useStyles = makeStyles({
  icon: {
    display: "inline-block",
    position: "relative",
    flexShrink: 0,
  },
  small: {
    width: "16px",
    height: "16px",
  },
  medium: {
    width: "20px", 
    height: "20px",
  },
  large: {
    width: "24px",
    height: "24px",
  },
});

type ProjectStatusIconSize = "small" | "medium" | "large";

interface ProjectStatusIconProps {
  status: ProjectStatus;
  size?: ProjectStatusIconSize;
}

const ProjectStatusIcon: React.FC<ProjectStatusIconProps> = ({ 
  status, 
  size = "medium" 
}) => {
  const styles = useStyles();
  
  const colors = PROJECT_COLORS[status];
  const sizeClass = styles[size];

  // Render folder icon with status overlay similar to web app
  const renderFolderIcon = () => {
    return (
      <svg
        className={mergeClasses(styles.icon, sizeClass)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Folder base */}
        <path
          d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"
          fill={colors.bg}
          stroke={colors.outline}
          strokeWidth="1"
        />
        
        {/* Status indicator overlay */}
        {status === ProjectStatus.Active && (
          // Lightning bolt for active projects
          <path
            d="M13 2L8 9h3l-1 8 5-7h-3l1-8z"
            fill={colors.icon}
            transform="translate(5, 3) scale(0.6)"
          />
        )}
        
        {status === ProjectStatus.Completed && (
          // Checkmark for completed projects
          <path
            d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
            fill={colors.icon}
            transform="translate(2, 2) scale(0.8)"
          />
        )}
        
        {status === ProjectStatus.Archived && (
          // Archive box for archived projects (no special icon, just folder)
          <></>
        )}
      </svg>
    );
  };

  return renderFolderIcon();
};

export default ProjectStatusIcon;