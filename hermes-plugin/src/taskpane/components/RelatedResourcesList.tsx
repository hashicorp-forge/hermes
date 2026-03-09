import * as React from "react";
import {
  makeStyles,
  Text,
  Button,
  ProgressBar,
} from "@fluentui/react-components";
import { Add24Regular } from "@fluentui/react-icons";
import { RelatedResource, combineAndSortResources, RelatedResourcesResponse } from "../interfaces/relatedResources";
import RelatedResourceItem from "./RelatedResourceItem";
import AddResourceForm from "./AddResourceForm";
import EditResourceForm from "./EditResourceForm";
import { RelatedExternalLink } from "../interfaces/relatedResources";
import IDocumentMetadata from "../interfaces/documentMetadata";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  label: {
    color: DarkTheme.text.tertiary,
    fontSize: "12px",
    fontWeight: 500,
  },

  addButton: {
    minWidth: "auto",
    padding: "4px 8px",
    backgroundColor: DarkTheme.interactive.primary,
    color: DarkTheme.text.primary,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  emptyState: {
    padding: "16px",
    textAlign: "center",
    color: DarkTheme.text.tertiary,
    fontSize: "14px",
    fontStyle: "italic",
  },

  emptyStateReadOnly: {
    padding: "8px",
    color: DarkTheme.text.tertiary,
    fontSize: "14px",
  },

  loadingContainer: {
    padding: "16px",
    display: "flex",
    justifyContent: "center",
  },

  errorContainer: {
    padding: "8px",
    fontSize: "14px",
    textAlign: "center",
  },

  retryButton: {
    marginTop: "8px",
  },
});

interface RelatedResourcesListProps {
  resources: RelatedResourcesResponse;
  isLoading: boolean;
  error: string | null;
  isOwner: boolean;
  baseUrl: string;
  onAdd: (resource: RelatedResource) => Promise<void>;
  onEdit: (resource: RelatedExternalLink) => Promise<void>;
  onRemove: (resource: RelatedResource) => Promise<void>;
  onRetry: () => void;
  onSearchDocuments?: (query: string) => Promise<IDocumentMetadata[]>;
}

const RelatedResourcesList: React.FC<RelatedResourcesListProps> = ({
  resources,
  isLoading,
  error,
  isOwner,
  baseUrl,
  onAdd,
  onEdit,
  onRemove,
  onRetry,
  onSearchDocuments,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [editingResource, setEditingResource] = React.useState<RelatedExternalLink | null>(null);

  const combinedResources = combineAndSortResources(resources);

  const handleAdd = async (resource: RelatedResource) => {
    try {
      await onAdd(resource);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add resource:", error);
      // Re-throw the error so AddResourceForm can handle it
      throw error;
    }
  };

  const handleEdit = async (resource: RelatedExternalLink) => {
    try {
      await onEdit(resource);
      setEditingResource(null);
    } catch (error) {
      console.error("Failed to edit resource:", error);
      // Re-throw the error so EditResourceForm can handle it
      throw error;
    }
  };

  const handleRemove = async (resource: RelatedResource) => {
    try {
      await onRemove(resource);
      setEditingResource(null);
    } catch (error) {
      console.error("Failed to remove resource:", error);
      // Re-throw the error so components can handle it
      throw error;
    }
  };

  const handleEditClick = (resource: RelatedExternalLink) => {
    setEditingResource(resource);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
  };

  const handleCancelEdit = () => {
    setEditingResource(null);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <ProgressBar />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorContainer} style={{ color: theme.interactive.danger }}>
          <Text>{error}</Text>
          <Button
            className={styles.retryButton}
            size="small"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (combinedResources.length === 0) {
      if (isOwner) {
        return (
          <div className={styles.emptyState}>
            <Text>No related resources yet. Click + to add one.</Text>
          </div>
        );
      } else {
        return (
          <div className={styles.emptyStateReadOnly}>
            <Text>None</Text>
          </div>
        );
      }
    }

    return (
      <div className={styles.list}>
        {combinedResources.map((resource, index) => (
          <React.Fragment key={`resource-${index}-${resource.sortOrder}`}>
            <RelatedResourceItem
              resource={resource}
              isOwner={isOwner}
              baseUrl={baseUrl}
              onEdit={handleEditClick}
              onRemove={onRemove}
            />
            {editingResource && editingResource.sortOrder === resource.sortOrder && (
              <EditResourceForm
                resource={editingResource}
                onSave={handleEdit}
                onRemove={handleRemove}
                onCancel={handleCancelEdit}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text className={styles.label} style={{ color: theme.text.tertiary }}>Related Resources</Text>
        {isOwner && !isLoading && !error && !showAddForm && (
          <Button
            className={styles.addButton}
            appearance="subtle"
            icon={<Add24Regular />}
            size="small"
            onClick={() => setShowAddForm(true)}
          />
        )}
      </div>

      {showAddForm && (
        <AddResourceForm
          onAdd={handleAdd}
          onCancel={handleCancelAdd}
          onSearchDocuments={onSearchDocuments}
        />
      )}

      {renderContent()}
    </div>
  );
};

export default RelatedResourcesList;