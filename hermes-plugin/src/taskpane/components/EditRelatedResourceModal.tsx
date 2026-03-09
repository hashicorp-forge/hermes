import * as React from "react";
import {
  makeStyles,
  Button,
  Input,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogBody,
  Field,
} from "@fluentui/react-components";
import { Delete24Regular } from "@fluentui/react-icons";
import { RelatedExternalLink } from "../interfaces/relatedResources";
import DarkTheme, { commonStyles } from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  dialogContent: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    minWidth: "400px",
    backgroundColor: DarkTheme.background.elevated,
    color: DarkTheme.text.primary,
  },

  urlPreview: {
    fontSize: "12px",
    color: DarkTheme.text.tertiary,
    fontStyle: "italic",
    wordBreak: "break-all",
  },

  errorText: {
    fontSize: "12px",
  },

  deleteSection: {
    borderTop: `1px solid ${DarkTheme.border.primary}`,
    paddingTop: "16px",
    marginTop: "8px",
  },

  deleteButton: {
    color: `${DarkTheme.interactive.danger} !important`,
    backgroundColor: "transparent !important",
    border: `1px solid ${DarkTheme.interactive.danger} !important`,
    borderRadius: "4px !important",
    fontWeight: "500 !important",
  },

  deleteText: {
    fontSize: "14px",
    color: DarkTheme.text.secondary,
    marginBottom: "12px",
  },

  fieldLabel: {
    "& label": {
      ...commonStyles.fieldLabel,
    },
  },

  inputField: commonStyles.inputField,
  primaryButton: commonStyles.primaryButton,
});

interface EditRelatedResourceModalProps {
  isOpen: boolean;
  resource: RelatedExternalLink;
  onClose: () => void;
  onSave: (resource: RelatedExternalLink) => Promise<void>;
  onRemove: (resource: RelatedExternalLink) => Promise<void>;
}

const EditRelatedResourceModal: React.FC<EditRelatedResourceModalProps> = ({
  isOpen,
  resource,
  onClose,
  onSave,
  onRemove,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isCancelHovered, setIsCancelHovered] = React.useState(false);
  const [url, setUrl] = React.useState(resource.url || "");
  const [name, setName] = React.useState(resource.name || "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [urlError, setUrlError] = React.useState("");

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
    
    try {
      const updatedResource: RelatedExternalLink = {
        ...resource,
        url: url.trim(),
        name: name.trim() || url.trim(),
      };

      await onSave(updatedResource);
    } catch (error) {
      console.error("Failed to save resource:", error);
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (window.confirm("Are you sure you want to remove this resource?")) {
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

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const hasChanges = url !== resource.url || name !== resource.name;

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Edit Related Resource</DialogTitle>
          <DialogContent className={styles.dialogContent} style={{ backgroundColor: theme.background.elevated, color: theme.text.primary }}>
            <Field
              label="URL"
              required
              validationState={urlError ? "error" : "none"}
              validationMessage={urlError}
              className={styles.fieldLabel}
            >
              <Input
                className={styles.inputField}
                value={url}
                onChange={(_, data) => handleUrlChange(data.value)}
                placeholder="https://example.com"
                disabled={isSubmitting}
              />
            </Field>

            <Field label="Name" className={styles.fieldLabel}>
              <Input
                className={styles.inputField}
                value={name}
                onChange={(_, data) => setName(data.value)}
                placeholder="Display name for the resource"
                disabled={isSubmitting}
              />
            </Field>

            {url && validateUrl(url) && (
              <div className={styles.urlPreview} style={{ color: theme.text.tertiary }}>
                Preview: {name.trim() || new URL(url).hostname.replace(/^www\./, "")}
              </div>
            )}

            <div className={styles.deleteSection} style={{ borderTopColor: theme.border.primary }}>
              <div className={styles.deleteText} style={{ color: theme.text.secondary }}>
                Remove this resource permanently
              </div>
              <Button
                className={styles.deleteButton}
                appearance="outline"
                icon={<Delete24Regular />}
                onClick={handleRemove}
                disabled={isSubmitting}
              >
                Remove Resource
              </Button>
            </div>
          </DialogContent>
          <DialogActions>
            <Button 
              appearance="secondary" 
              onClick={handleClose}
              disabled={isSubmitting}
              onMouseEnter={() => setIsCancelHovered(true)}
              onMouseLeave={() => setIsCancelHovered(false)}
              style={{
                backgroundColor: isCancelHovered ? theme.background.tertiary : "transparent",
                color: isCancelHovered ? theme.text.primary : theme.text.secondary,
                border: `1px solid ${isCancelHovered ? theme.border.secondary : theme.border.primary}`,
                borderRadius: "4px",
                fontWeight: "500",
              }}
            >
              Cancel
            </Button>
            <Button 
              className={styles.primaryButton}
              appearance="primary" 
              onClick={handleSave}
              disabled={isSubmitting || !url.trim() || !hasChanges}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default EditRelatedResourceModal;