import * as React from "react";
import {
  makeStyles,
  mergeClasses,
  Text,
  Button,
  Input,
  Field,
} from "@fluentui/react-components";
import { 
  Dismiss24Regular, 
  Checkmark24Regular, 
  Delete24Regular 
} from "@fluentui/react-icons";
import { RelatedExternalLink } from "../interfaces/relatedResources";
import DarkTheme, { commonStyles } from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: DarkTheme.background.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "6px",
    marginTop: "4px",
  },

  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  buttonRow: {
    display: "flex",
    gap: "8px",
    justifyContent: "space-between",
    alignItems: "center",
  },

  primaryButtons: {
    display: "flex",
    gap: "8px",
  },

  button: {
    minWidth: "auto",
    padding: "6px 12px",
    borderRadius: "4px !important",
    fontWeight: "600 !important",
  },

  cancelButton: {
    minWidth: "auto",
    padding: "6px 12px",
  },

  saveButton: {
    ...commonStyles.primaryButton,
    minWidth: "auto",
    padding: "6px 12px",
  },

  deleteButton: commonStyles.dangerButton,

  urlPreview: {
    fontSize: "12px",
    color: DarkTheme.text.tertiary,
    fontStyle: "italic",
    wordBreak: "break-all",
    marginTop: "4px",
  },

  errorText: {
    fontSize: "12px",
    marginTop: "4px",
  },

  errorContainer: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "6px",
    marginTop: "4px",
  },

  fieldLabel: {
    "& label": {
      ...commonStyles.fieldLabel,
    },
  },

  inputField: commonStyles.inputField,
});

interface EditResourceFormProps {
  resource: RelatedExternalLink;
  onSave: (resource: RelatedExternalLink) => Promise<void>;
  onRemove: (resource: RelatedExternalLink) => Promise<void>;
  onCancel: () => void;
}

const EditResourceForm: React.FC<EditResourceFormProps> = ({
  resource,
  onSave,
  onRemove,
  onCancel,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isCancelHovered, setIsCancelHovered] = React.useState(false);
  const [url, setUrl] = React.useState(resource.url || "");
  const [name, setName] = React.useState(resource.name || "");
  const [urlError, setUrlError] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setUrl(resource.url || "");
    setName(resource.name || "");
    setUrlError("");
  }, [resource]);

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setUrlError("");
  };

  const handleSave = async () => {
    if (!url.trim()) {
      setUrlError("URL is required");
      return;
    }

    if (!validateUrl(url.trim())) {
      setUrlError("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);
    setSaveError("");
    try {
      const updatedResource: RelatedExternalLink = {
        ...resource,
        url: url.trim(),
        name: name.trim() || url.trim(),
      };

      await onSave(updatedResource);
    } catch (error) {
      console.error("Failed to save resource:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save resource - please try again";
      setSaveError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    // Simple confirmation using window.confirm (allowed in task panes)
    if (confirm("Are you sure you want to remove this resource?")) {
      setIsSubmitting(true);
      try {
        await onRemove(resource);
      } catch (error) {
        console.error("Failed to remove resource:", error);
        // Error handling is managed by parent component
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape" && !isSubmitting) {
      e.preventDefault();
      onCancel();
    }
  };

  const hasChanges = url !== resource.url || name !== resource.name;

  return (
    <div className={styles.container} onKeyDown={handleKeyPress} style={{ backgroundColor: theme.background.secondary, borderColor: theme.border.primary }}>
      <Text weight="semibold" size={300} style={{ color: theme.text.primary }}>
        Edit Resource
      </Text>
      
      <div className={styles.formRow}>
        <Field
          label="URL"
          required
          validationState={urlError ? "error" : "none"}
          size="small"
          className={styles.fieldLabel}
        >
          <Input
            className={styles.inputField}
            value={url}
            onChange={(_, data) => handleUrlChange(data.value)}
            placeholder="https://example.com"
            disabled={isSubmitting}
            size="small"
          />
        </Field>
        {urlError && (
          <Text className={styles.errorText} style={{ color: theme.interactive.danger }}>{urlError}</Text>
        )}
      </div>

      <div className={styles.formRow}>
        <Field label="Name" size="small" className={styles.fieldLabel}>
          <Input
            className={styles.inputField}
            value={name}
            onChange={(_, data) => setName(data.value)}
            placeholder="Display name for the resource"
            disabled={isSubmitting}
            size="small"
          />
        </Field>
      </div>

      {url && validateUrl(url) && (
        <Text className={styles.urlPreview} style={{ color: theme.text.tertiary }}>
          Preview: {name.trim() || new URL(url).hostname.replace(/^www\./, "")}
        </Text>
      )}

      {saveError && (
        <div className={styles.errorContainer} style={{ backgroundColor: theme.background.error, border: `1px solid ${theme.interactive.danger}` }}>
          <Text className={styles.errorText} style={{ color: theme.interactive.danger }}>
            {saveError}
          </Text>
        </div>
      )}

      <div className={styles.buttonRow}>
        <Button
          className={mergeClasses(styles.button, styles.deleteButton)}
          appearance="subtle"
          icon={<Delete24Regular />}
          onClick={handleRemove}
          disabled={isSubmitting}
          size="small"
        >
          Remove
        </Button>
        
        <div className={styles.primaryButtons}>
          <Button 
            className={mergeClasses(styles.button, styles.cancelButton)}
            appearance="subtle"
            icon={<Dismiss24Regular />}
            onClick={onCancel}
            disabled={isSubmitting}
            size="small"
            onMouseEnter={() => setIsCancelHovered(true)}
            onMouseLeave={() => setIsCancelHovered(false)}
            style={{
              backgroundColor: isCancelHovered ? theme.background.tertiary : "transparent",
              color: isCancelHovered ? theme.text.primary : theme.text.secondary,
              border: `1px solid ${isCancelHovered ? theme.border.secondary : theme.border.primary}`,
            }}
          >
            Cancel
          </Button>
          <Button 
            className={mergeClasses(styles.button, styles.saveButton)}
            appearance="primary"
            icon={<Checkmark24Regular />}
            onClick={handleSave}
            disabled={isSubmitting || !url.trim() || !hasChanges}
            size="small"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditResourceForm;