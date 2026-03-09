import * as React from "react";
import {
  makeStyles,
  Text,
  Button,
  Input,
  ProgressBar,
  Tooltip,
} from "@fluentui/react-components";
import {
  Add24Regular,
  Search24Regular,
  Dismiss24Regular,
  QuestionCircle16Regular,
} from "@fluentui/react-icons";
import { HermesProject } from "../interfaces/project";
import ProjectIcon from "./ProjectIcon";
import WordPluginController from "../utils/wordPluginController";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

// Utility function to truncate text to a specified length
const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
};

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  projectsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  projectItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    borderRadius: "8px",
    border: `1px solid ${DarkTheme.border.primary}`,
    backgroundColor: DarkTheme.background.secondary,
    transition: "all 0.2s ease",
    cursor: "pointer",
    minWidth: 0, // Allow flexbox to shrink below content width
    width: "100%", // Ensure full width usage
    boxSizing: "border-box", // Include padding/border in width calculation
    ":hover": {
      backgroundColor: "var(--project-item-hover-bg)",
    },
  },

  projectInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0, // Allow flexbox to shrink below content width
    overflow: "hidden", // Prevent content from breaking out
  },

  projectTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: DarkTheme.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  projectDescription: {
    fontSize: "12px",
    color: DarkTheme.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    "-webkit-line-clamp": "2",
    "-webkit-box-orient": "vertical",
    lineHeight: "1.4",
    maxHeight: "2.8em", // 2 lines * 1.4 line-height
    wordBreak: "break-word",
  },

  projectIcon: {
    width: "20px",
    height: "20px",
    flexShrink: 0,
  },

  addProjectSection: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "8px",
    borderRadius: "8px",
    border: `1px solid ${DarkTheme.border.primary}`,
    backgroundColor: DarkTheme.background.secondary,
  },

  searchInput: {
    width: "100%",
  },

  searchResults: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "200px",
    overflowY: "auto",
  },

  searchResultItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    borderRadius: "8px",
    border: `1px solid ${DarkTheme.border.primary}`,
    backgroundColor: DarkTheme.background.secondary,
    cursor: "pointer",
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: "var(--project-search-item-hover-bg)",
    },
  },

  actionButtons: {
    display: "flex",
    gap: "4px",
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

  emptyState: {
    padding: "16px",
    textAlign: "center",
    color: DarkTheme.text.tertiary,
    fontSize: "14px",
  },
});

interface ProjectsListProps {
  projects: HermesProject[];
  isLoading: boolean;
  error: string | null;
  isOwner: boolean;
  isDraft: boolean;
  showAddForm?: boolean;
  controller: WordPluginController;
  onAdd: (project: HermesProject) => Promise<void>;
  onRemove: (projectId: string) => Promise<void>;
  onRetry: () => void;
}

const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  isLoading,
  error,
  isOwner,
  isDraft,
  showAddForm: externalShowAddForm,
  controller,
  onAdd,
  onRemove,
  onRetry,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [showAddForm, setShowAddForm] = React.useState(externalShowAddForm || false);

  // Update local state when external prop changes
  React.useEffect(() => {
    if (externalShowAddForm !== undefined) {
      setShowAddForm(externalShowAddForm);
    }
  }, [externalShowAddForm]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<HermesProject[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  // Debounced search effect
  React.useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        setSearchError(null);

        try {
          const results = await controller.searchProjects(searchQuery.trim());

          // Filter out projects that are already associated with the document
          const filteredResults = results.filter(result =>
            !projects.some(existingProject => existingProject.id === result.id)
          );

          setSearchResults(filteredResults);
        } catch (error) {
          console.error("Failed to search projects:", error);
          setSearchError(error instanceof Error ? error.message : "Failed to search projects");
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, projects, controller]);

  const handleAddProject = async (project: HermesProject) => {
    try {
      await onAdd(project);
      setSearchQuery("");
      setSearchResults([]);
      setShowAddForm(false);
    } catch (error) {
      console.error("Failed to add project:", error);
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    try {
      await onRemove(projectId);
    } catch (error) {
      console.error("Failed to remove project:", error);
    }
  };

  const renderContent = () => {
    if (isDraft) {
      return (
        <div>
          <Text style={{ color: theme.text.tertiary, fontSize: "12px", fontStyle: "italic" }}>
            Publish to manage projects
          </Text>
        </div>
      );
    }

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
            size="small"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      );
    }

    return (
      <>
        {/* Existing projects list */}
        {projects.length > 0 ? (
          <div className={styles.projectsList}>
            {projects.map((project) => (
              <div
                key={project.id}
                className={styles.projectItem}
                style={{
                  backgroundColor: theme.background.secondary,
                  borderColor: theme.border.primary,
                  "--project-item-hover-bg": theme.background.tertiary,
                } as React.CSSProperties}
              >
                <ProjectIcon className={styles.projectIcon} />
                <div
                  className={styles.projectInfo}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const baseUrl = controller.getHermesBaseUrl();
                    const projectUrl = `${baseUrl}/projects/${project.id}`;
                    window.open(projectUrl, '_blank');
                  }}
                >
                  <Tooltip
                    content={project.title.length > 50 ? project.title : undefined}
                    relationship="description"
                  >
                    <Text className={styles.projectTitle} style={{ color: theme.text.primary }}>{truncateText(project.title, 50)}</Text>
                  </Tooltip>
                  {project.description && (
                    <Tooltip
                      content={project.description.length > 100 ? project.description : undefined}
                      relationship="description"
                    >
                      <Text className={styles.projectDescription} style={{ color: theme.text.secondary }}>
                        {truncateText(project.description, 100)}
                      </Text>
                    </Tooltip>
                  )}
                </div>
                {isOwner && (
                  <Tooltip content="Remove from project" relationship="label">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<Dismiss24Regular />}
                      onClick={() => handleRemoveProject(project.id)}
                      aria-label="Remove from project"
                    />
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
                <Text style={{ color: theme.text.tertiary }}>No projects associated with this document.</Text>
          </div>
        )}

        {/* Add project section */}
        {isOwner && showAddForm && (
          <div className={styles.addProjectSection} style={{ backgroundColor: theme.background.secondary, borderColor: theme.border.primary }}>
            <Input
              className={styles.searchInput}
              placeholder="Search projects..."
              value={searchQuery}
              contentBefore={<Search24Regular />}
              contentAfter={
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Dismiss24Regular />}
                  onClick={() => {
                    setShowAddForm(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                />
              }
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {isSearching && (
              <div style={{ padding: "8px", textAlign: "center" }}>
                <ProgressBar />
              </div>
            )}

            {searchError && (
              <div className={styles.errorContainer} style={{ color: theme.interactive.danger }}>
                <Text>{searchError}</Text>
              </div>
            )}

            {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
              <div style={{ padding: "8px", textAlign: "center", color: theme.text.tertiary, fontSize: "12px" }}>
                <Text>Type at least 2 characters to search...</Text>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((project) => (
                  <div
                    key={project.id}
                    className={styles.searchResultItem}
                    onClick={() => handleAddProject(project)}
                    style={{
                      backgroundColor: theme.background.secondary,
                      borderColor: theme.border.primary,
                      "--project-search-item-hover-bg": theme.background.tertiary,
                    } as React.CSSProperties}
                  >
                    <ProjectIcon className={styles.projectIcon} />
                    <div className={styles.projectInfo}>
                      <Tooltip
                        content={project.title.length > 50 ? project.title : undefined}
                        relationship="description"
                      >
                        <Text className={styles.projectTitle} style={{ color: theme.text.primary }}>{truncateText(project.title, 50)}</Text>
                      </Tooltip>
                      {project.description && (
                        <Tooltip
                          content={project.description.length > 100 ? project.description : undefined}
                          relationship="description"
                        >
                          <Text className={styles.projectDescription} style={{ color: theme.text.secondary }}>
                            {truncateText(project.description, 100)}
                          </Text>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && !searchError && (
              <div className={styles.emptyState}>
                <Text>No projects found for "{searchQuery}"</Text>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={styles.container}>
      {renderContent()}
    </div>
  );
};

export default ProjectsList;