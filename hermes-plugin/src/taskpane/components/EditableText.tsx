import { Text, Input, Button, Textarea, makeStyles, mergeClasses } from "@fluentui/react-components";
import { Checkmark24Regular, Dismiss24Regular, Edit16Regular } from "@fluentui/react-icons";
import * as React from "react";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

type EditableTitleProps = {
  label?: string;
  text: string;
  size?: 400 | 100 | 200 | 300 | 500 | 600 | 700 | 800 | 900 | 1000;
  weight?: "bold" | "medium" | "semibold" | "regular";
  multiline?: boolean; // New prop to control single-line vs multi-line
  disabled?: boolean; // New prop to disable editing
  onChange: (value: string) => Promise<void>;
} & React.PropsWithChildren;

const useStyle = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "4px", width: "100%" },
  formContainer: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "8px", 
    width: "100%"
  },
  formContainerInline: {
    display: "flex", 
    gap: "8px", 
    alignItems: "center", 
    width: "100%"
  },
  buttonContainer: { 
    display: "flex", 
    gap: "8px", 
    alignItems: "center"
  },
  input: {
    backgroundColor: `${DarkTheme.components.input.background} !important`,
    border: `1px solid ${DarkTheme.border.primary} !important`,
    borderRadius: "4px !important",
    color: `${DarkTheme.text.primary} !important`,
    boxSizing: "border-box",
    "& input": {
      padding: "4px !important",
    },
    "&::placeholder": {
      color: `${DarkTheme.components.input.placeholder} !important`,
    },
  },
  textarea: { 
    minHeight: "100px",
    width: "100%",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "14px",
    lineHeight: "1.4",
    backgroundColor: `${DarkTheme.components.input.background} !important`,
    border: `1px solid ${DarkTheme.border.primary} !important`,
    borderRadius: "4px !important",
    color: `${DarkTheme.text.primary} !important`,
    boxSizing: "border-box",
    "& textarea": {
      padding: "6px 12px !important",
      resize: "vertical",
      minHeight: "100px !important",
    },
    "&::placeholder": {
      color: `${DarkTheme.components.input.placeholder} !important`,
    },
  },
  label: {
    color: DarkTheme.text.tertiary,
    fontSize: "12px",
    fontWeight: 500,
  },
  clickableText: {
    padding: "8px",
    borderRadius: "4px",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    minHeight: "36px",
  },
  editIcon: {
    position: "absolute",
    top: "4px",
    right: "4px",
    transition: "opacity 0.2s",
    pointerEvents: "none",
    color: DarkTheme.text.tertiary,
  },
  primaryButton: {
    backgroundColor: `${DarkTheme.interactive.primary} !important`,
    color: `${DarkTheme.text.primary} !important`,
    border: "none !important",
    borderRadius: "4px !important",
    fontWeight: "600 !important",
    ":hover": {
      backgroundColor: `${DarkTheme.interactive.primaryHover} !important`,
    },
  },
  secondaryButton: {
    backgroundColor: "transparent !important",
    color: `${DarkTheme.text.secondary} !important`,
    border: `1px solid ${DarkTheme.border.primary} !important`,
    borderRadius: "4px !important",
    fontWeight: "500 !important",
  },
  errorText: {
    marginTop: "4px",
    fontSize: "12px",
    display: "block",
  },
});

const EditableTitle = ({
  label,
  text: originalTitle,
  size,
  weight,
  multiline = false,
  disabled = false,
  onChange,
}: EditableTitleProps) => {
  const styles = useStyle();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const [isEditing, setIsEditing] = React.useState(false);
  const [title, setTitle] = React.useState(originalTitle || "");
  const [draft, setDraft] = React.useState(originalTitle || "");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);

  // Update title when originalTitle prop changes
  React.useEffect(() => {
    setTitle(originalTitle || "");
    if (!isEditing) {
      setDraft(originalTitle || "");
    }
  }, [originalTitle, isEditing]);



  const handleSave = async () => {
    setIsSaving(true);
    setError(null); // Clear previous errors
    
    try {
      // Trim the draft to handle whitespace-only input
      const trimmedDraft = (draft || "").trim();
      await onChange(trimmedDraft);
      setTitle(trimmedDraft);
      setIsEditing(false); // Close only after successful save
    } catch (err: any) {
      // Extract HTTP status code from error
      let statusCode = "";
      
      if (err.response) {
        // Axios-style HTTP error response
        statusCode = `${err.response.status}`;
      } else if (err.message) {
        // Parse HermesClient error format for status code
        const statusMatch = err.message.match(/status:\s*(\d+)/);
        if (statusMatch) {
          statusCode = statusMatch[1];
        }
      }
      
      const fullError = statusCode ? `Server Responded : ${statusCode}` : "Server Error";
      setError(fullError);
      
      // Don't close field on error - let user see error and retry
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(title);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className={styles.root}>
      {label && (
        <Text className={styles.label}>
          {label}
        </Text>
      )}
      {isEditing ? (
        <>
          <div className={multiline ? styles.formContainer : styles.formContainerInline}>
            {multiline ? (
              <Textarea 
                className={styles.textarea}
                value={draft} 
                onChange={(_, data) => setDraft(data.value)}
                resize="vertical"
              />
            ) : (
              <Input 
                className={styles.input}
                value={draft} 
                onChange={(_, data) => setDraft(data.value)} 
                size="medium" 
              />
            )}
            <div className={styles.buttonContainer}>
              <Button 
                className={styles.primaryButton}
                appearance="primary" 
                size="medium"
                icon={<Checkmark24Regular />} 
                onClick={handleSave}
                disabled={isSaving}
              />
              <Button 
                className={styles.secondaryButton}
                appearance="secondary" 
                size="medium"
                icon={<Dismiss24Regular />} 
                onClick={handleCancel}
                disabled={isSaving}
              />
            </div>
          </div>
          {error && (
            <Text className={styles.errorText} style={{ color: theme.interactive.danger }}>
              Error: {error}
            </Text>
          )}
        </>
      ) : (
        <div 
          className={styles.clickableText}
          onClick={disabled ? undefined : () => setIsEditing(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            cursor: disabled ? "default" : "pointer",
            color: theme.text.primary,
            backgroundColor: isHovered && !disabled ? theme.background.tertiary : "transparent",
            boxShadow: isHovered && !disabled ? theme.shadows.small : undefined,
          }}
        >
          <div style={{ display: "block", width: "100%" }}>
            <Text
              weight={weight}
              size={size}
              style={{ 
                color: title.trim() ? theme.text.primary : theme.text.placeholder,
                display: "block",
              }}
            >
              {title.trim() || "None"}
            </Text>
          </div>
          {!disabled && (
            <Edit16Regular 
              className={styles.editIcon}
              style={{
                opacity: isHovered ? 1 : 0
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EditableTitle;
