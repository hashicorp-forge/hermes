import * as React from "react";
import {
  makeStyles,
  mergeClasses,
  Text,
  Button,
  Tooltip,
} from "@fluentui/react-components";
import { 
  Document24Regular, 
  Link24Regular, 
  Edit24Regular, 
  Delete24Regular,
  Open16Regular 
} from "@fluentui/react-icons";
import { 
  RelatedResource, 
  RelatedExternalLink, 
  isExternalLink, 
  isHermesDocument 
} from "../interfaces/relatedResources";
import DocumentThumbnail from "./DocumentThumbnail";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  container: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px",
    borderRadius: "6px",
    transition: "all 0.2s ease",
  },

  clickableContainer: {
    cursor: "pointer",
  },

  iconContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  simpleIconContainer: {
    width: "24px",
    height: "24px",
  },

  documentIcon: {
    color: DarkTheme.interactive.primary,
  },

  linkIcon: {
    color: DarkTheme.text.tertiary,
  },

  contentContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flexGrow: 1,
    minWidth: 0, // Allow text truncation
  },

  title: {
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "1.2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  subtitle: {
    fontSize: "12px",
    lineHeight: "1.2",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  actionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },

  actionButton: {
    minWidth: "auto",
    padding: "4px",
  },

  editButton: {
    color: DarkTheme.interactive.primary,
  },

  removeButton: {
    color: DarkTheme.interactive.danger,
  },

  openButton: {
    color: DarkTheme.text.tertiary,
  },
});

interface RelatedResourceItemProps {
  resource: RelatedResource;
  isOwner: boolean;
  baseUrl: string;
  onEdit: (resource: RelatedExternalLink) => void;
  onRemove: (resource: RelatedResource) => void;
}

const RelatedResourceItem: React.FC<RelatedResourceItemProps> = ({
  resource,
  isOwner,
  baseUrl,
  onEdit,
  onRemove,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isHovered, setIsHovered] = React.useState(false);

  const handleClick = () => {
    if (isExternalLink(resource)) {
      // Open external link in new tab
      window.open(resource.url, "_blank", "noopener,noreferrer");
    } else if (isHermesDocument(resource)) {
      // Open Hermes document in new tab using the correct baseUrl
      const documentUrl = `${baseUrl}/document/${resource.FileID}`;
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExternalLink(resource)) {
      onEdit(resource);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(resource);
  };

  const getIcon = () => {
    if (isHermesDocument(resource)) {
      return (
        <DocumentThumbnail 
          product={resource.product}
          status={resource.status}
        />
      );
    } else {
      return <Link24Regular className={styles.linkIcon} />;
    }
  };

  const getTitle = () => {
    if (isHermesDocument(resource)) {
      return resource.title;
    } else {
      return resource.name || resource.url;
    }
  };

  const getSubtitle = () => {
    if (isHermesDocument(resource)) {
      const parts = [];
      if (resource.documentType) {
        parts.push(resource.documentType);
      }
      if (resource.documentNumber) {
        parts.push(resource.documentNumber);
      }
      return parts.join(" · ");
    } else {
      // For external links, show the domain
      try {
        const url = new URL(resource.url);
        return url.hostname.replace(/^www\./, "");
      } catch {
        return resource.url;
      }
    }
  };

  const containerClasses = [
    styles.container,
    (isExternalLink(resource) || isHermesDocument(resource)) ? styles.clickableContainer : ""
  ].join(" ");

  return (
    <div 
      className={containerClasses}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: isHovered ? theme.background.tertiary : theme.background.secondary,
        border: `1px solid ${theme.border.primary}`,
      }}
    >
      <div className={mergeClasses(styles.iconContainer, isExternalLink(resource) && styles.simpleIconContainer)}>
        {getIcon()}
      </div>

      <div className={styles.contentContainer}>
        <Text className={styles.title} style={{ color: theme.text.primary }}>
          {getTitle()}
        </Text>
        <Text className={styles.subtitle} style={{ color: theme.text.secondary }}>
          {getSubtitle()}
        </Text>
      </div>

      {isOwner && (
        <div className={styles.actionsContainer}>
          {isExternalLink(resource) && (
            <>
              <Tooltip content="Open link" relationship="label">
                <Button
                  className={mergeClasses(styles.actionButton, styles.openButton)}
                  appearance="subtle"
                  icon={<Open16Regular />}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                />
              </Tooltip>
              <Tooltip content="Edit resource" relationship="label">
                <Button
                  className={mergeClasses(styles.actionButton, styles.editButton)}
                  appearance="subtle"
                  icon={<Edit24Regular />}
                  size="small"
                  onClick={handleEdit}
                />
              </Tooltip>
            </>
          )}
          <Tooltip content="Remove resource" relationship="label">
            <Button
              className={mergeClasses(styles.actionButton, styles.removeButton)}
              appearance="subtle"
              icon={<Delete24Regular />}
              size="small"
              onClick={handleRemove}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default RelatedResourceItem;