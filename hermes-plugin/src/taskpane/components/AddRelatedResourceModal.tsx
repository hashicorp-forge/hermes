import * as React from "react";
import {
  makeStyles,
  Text,
  Button,
  Input,
  Label,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogBody,
  Field,
} from "@fluentui/react-components";
import { RelatedResource, RelatedExternalLink } from "../interfaces/relatedResources";
import DarkTheme from "../utils/darkTheme";
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

  fieldContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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

  helpText: {
    fontSize: "12px",
    color: DarkTheme.text.tertiary,
    marginTop: "4px",
  },

  fieldLabel: {
    "& label": {
      color: `${DarkTheme.text.primary} !important`,
      fontSize: "14px !important",
      fontWeight: "500 !important",
    },
  },

  inputField: {
    backgroundColor: `${DarkTheme.components.input.background} !important`,
    border: `1px solid ${DarkTheme.border.primary} !important`,
    borderRadius: "4px !important",
    color: `${DarkTheme.text.primary} !important`,
    "&::placeholder": {
      color: `${DarkTheme.components.input.placeholder} !important`,
    },
  },

  primaryButton: {
    backgroundColor: `${DarkTheme.interactive.primary} !important`,
    color: `${DarkTheme.text.primary} !important`,
    border: "none !important",
    borderRadius: "4px !important",
    fontWeight: "600 !important",
  },
});

interface AddRelatedResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resource: RelatedResource) => Promise<void>;
}

const AddRelatedResourceModal: React.FC<AddRelatedResourceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isCancelHovered, setIsCancelHovered] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [name, setName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [urlError, setUrlError] = React.useState("");

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
    
    // Auto-generate name from URL if name is empty
    if (!name.trim() && value.trim()) {
      try {
        const urlObj = new URL(value);
        const hostname = urlObj.hostname.replace(/^www\./, "");
        setName(hostname);
      } catch {
        // Invalid URL, don't auto-generate name
      }
    }
  };

  const handleSubmit = async () => {
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
      const resource: RelatedExternalLink = {
        url: url.trim(),
        name: name.trim() || url.trim(),
        sortOrder: Date.now(), // Temporary sort order, will be adjusted by server
      };

      await onAdd(resource);
      
      // Reset form
      setUrl("");
      setName("");
      setUrlError("");
    } catch (error) {
      console.error("Failed to add resource:", error);
      // Error handling is managed by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setUrl("");
      setName("");
      setUrlError("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Add Related Resource</DialogTitle>
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

            <Field
              label="Name (optional)"
              className={styles.fieldLabel}
            >
              <Input
                className={styles.inputField}
                value={name}
                onChange={(_, data) => setName(data.value)}
                placeholder="Display name for the resource"
                disabled={isSubmitting}
              />
              <div className={styles.helpText} style={{ color: theme.text.tertiary }}>
                If left empty, the URL domain will be used as the name
              </div>
            </Field>

            {url && validateUrl(url) && (
              <div className={styles.urlPreview} style={{ color: theme.text.tertiary }}>
                Preview: {name.trim() || new URL(url).hostname.replace(/^www\./, "")}
              </div>
            )}
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
              onClick={handleSubmit}
              disabled={isSubmitting || !url.trim()}
            >
              {isSubmitting ? "Adding..." : "Add Resource"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default AddRelatedResourceModal;