import * as React from "react";
import {
  makeStyles,
  mergeClasses,
  Text,
  Button,
  Input,
  Field,
  ProgressBar,
} from "@fluentui/react-components";
import { Dismiss24Regular, Checkmark24Regular, Document24Regular, Link24Regular } from "@fluentui/react-icons";
import { RelatedResource, RelatedExternalLink, RelatedHermesDocument } from "../interfaces/relatedResources";
import IDocumentMetadata from "../interfaces/documentMetadata";
import DocumentThumbnail from "./DocumentThumbnail";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "0",
  },

  formRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  buttonRow: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    paddingTop: "8px",
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

  addButton: {
    backgroundColor: `${DarkTheme.interactive.primary} !important`,
    color: `${DarkTheme.text.primary} !important`,
    border: "none !important",
  },

  helpText: {
    fontSize: "12px",
    color: DarkTheme.text.tertiary,
    marginTop: "4px",
  },

  searchResult: {
    padding: "12px 0",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    transition: "background-color 0.1s ease",
    ":last-child": {
      borderBottom: "none",
    },
  },

  searchResultContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0, // Allow text to truncate
  },

  searchResults: {
    display: "flex",
    flexDirection: "column",
    maxHeight: "240px",
    overflowY: "auto",
    marginTop: "8px",
  },

  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "16px 0",
  },

  documentTitle: {
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "1.4",
  },

  documentSubtitle: {
    fontSize: "13px",
    lineHeight: "1.2",
  },

  errorContainer: {
    display: "flex",
    alignItems: "center",
    padding: "8px 12px",
    borderRadius: "6px",
    marginTop: "4px",
  },
  errorText: {
    fontSize: "14px",
    fontWeight: 400,
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
});



interface AddResourceFormProps {
  onAdd: (resource: RelatedResource) => Promise<void>;
  onCancel: () => void;
  onSearchDocuments?: (query: string) => Promise<IDocumentMetadata[]>;
}

const AddResourceForm: React.FC<AddResourceFormProps> = ({
  onAdd,
  onCancel,
  onSearchDocuments,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isCancelHovered, setIsCancelHovered] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Single input state that handles both URLs and search
  const [inputValue, setInputValue] = React.useState("");
  const [isUrl, setIsUrl] = React.useState(false);
  const [urlName, setUrlName] = React.useState("");
  const [showUrlNameInput, setShowUrlNameInput] = React.useState(false);

  // Search state
  const [searchResults, setSearchResults] = React.useState<IDocumentMetadata[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Error states
  const [error, setError] = React.useState<string>("");
  const [searchTimeout, setSearchTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const getOwnerDisplayName = (email: string): string => {
    if (!email) return 'Unknown Owner';

    // Extract name part from email and format it
    const namePart = email.split('@')[0];

    // Convert formats like "john.doe" or "john_doe" to "John Doe"
    return namePart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setError("");

    const isValidUrl = validateUrl(value.trim());
    setIsUrl(isValidUrl);

    if (isValidUrl) {
      // Auto-generate name from URL
      try {
        const urlObj = new URL(value);
        const hostname = urlObj.hostname.replace(/^www\./, "");
        setUrlName(hostname);
        setShowUrlNameInput(true);
        setSearchResults([]); // Clear search results when URL is detected
      } catch {
        // Should not happen since validateUrl passed
      }
    } else {
      setShowUrlNameInput(false);

      // Handle document search
      if (onSearchDocuments && value.trim().length >= 2) {
        // Clear previous timeout
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }

        // Debounce search
        const timeout = setTimeout(async () => {
          setIsSearching(true);
          try {
            const results = await onSearchDocuments(value.trim());
            setSearchResults(results || []);
          } catch (error) {
            console.error("Document search failed:", error);
            const errorMessage = error instanceof Error ? error.message : "Search failed - please try again";
            setError(errorMessage);
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        }, 300);

        setSearchTimeout(timeout);
      } else {
        setSearchResults([]);
      }
    }
  };

  const handleDocumentClick = async (doc: IDocumentMetadata) => {
    setIsSubmitting(true);
    setError("");

    try {
      const resource: RelatedHermesDocument = {
        FileID: doc.objectID,
        title: doc.title,
        documentType: doc.docType,
        documentNumber: doc.docNumber,
        sortOrder: Date.now(),
        createdTime: doc.createdTime,
        modifiedTime: doc.modifiedTime,
        product: doc.product,
        status: doc.status,
        owners: doc.owners || [],
        summary: doc.summary,
      };

      await onAdd(resource);

      // Form will be closed by parent component after successful add
    } catch (error) {
      console.error("Failed to add document:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add document - please try again";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!inputValue.trim() || !validateUrl(inputValue.trim())) {
      setError("Please enter a valid URL");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const resource: RelatedExternalLink = {
        url: inputValue.trim(),
        name: urlName.trim() || inputValue.trim(),
        sortOrder: Date.now(),
      };

      await onAdd(resource);

      // Form will be closed by parent component after successful add
    } catch (error) {
      console.error("Failed to add URL:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add URL - please try again";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className={styles.container}>
      <Text weight="semibold" size={300}>
        Add Related Resource
      </Text>

      <div className={styles.formRow}>
        <Field label="Search for a document or Paste a URL" size="small" className={styles.fieldLabel}>
          <Input
            value={inputValue}
            onChange={(_, data) => handleInputChange(data.value)}
            placeholder="Type document name or paste URL..."
            disabled={isSubmitting}
            size="small"
            className={styles.inputField}
          />
        </Field>
      </div>

      {showUrlNameInput && (
        <div className={styles.formRow}>
          <Field label="Display Name" size="small" className={styles.fieldLabel}>
            <Input
              value={urlName}
              onChange={(_, data) => setUrlName(data.value)}
              placeholder="Name for this resource"
              disabled={isSubmitting}
              size="small"
              className={styles.inputField}
            />
          </Field>
          <div className={styles.buttonRow}>
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
              className={mergeClasses(styles.button, styles.addButton)}
              appearance="primary"
              icon={<Checkmark24Regular />}
              onClick={handleUrlSubmit}
              disabled={isSubmitting}
              size="small"
            >
              {isSubmitting ? "Adding..." : "Add URL"}
            </Button>
          </div>
        </div>
      )}

      {isSearching && !isUrl && (
        <div className={styles.loadingContainer}>
          <ProgressBar />
        </div>
      )}

      {searchResults.length > 0 && !isUrl && (
        <div className={styles.searchResults}>
          {searchResults.map((doc) => (
            <div
              key={doc.objectID}
              className={styles.searchResult}
              onClick={() => handleDocumentClick(doc)}
              style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              <DocumentThumbnail
                product={doc.product}
                status={doc.status}
              />
              <div className={styles.searchResultContent}>
                <Text className={styles.documentTitle} style={{ color: theme.text.primary }}>
                  {doc.title}
                </Text>
                <Text className={styles.documentSubtitle} style={{ color: theme.text.secondary }}>
                  {doc.docType} · {doc.docNumber} · {doc.owners && doc.owners.length > 0 ? getOwnerDisplayName(doc.owners[0]) : 'Unknown Owner'}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}

      {inputValue.length >= 2 && !isSearching && searchResults.length === 0 && !isUrl && (
        <Text className={styles.helpText}>
          No documents found matching "{inputValue}"
        </Text>
      )}

      {error && (
        <div className={styles.errorContainer} style={{ backgroundColor: theme.background.error, border: `1px solid ${theme.interactive.danger}` }}>
          <Text className={styles.errorText} style={{ color: theme.interactive.danger }}>
            {error}
          </Text>
        </div>
      )}

      {!showUrlNameInput && (
        <div className={styles.buttonRow}>
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
        </div>
      )}
    </div>
  );
};

export default AddResourceForm;