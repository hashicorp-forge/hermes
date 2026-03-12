import * as React from "react";
import { makeStyles, ProgressBar, Button, Text, FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import Sidebar from "./Sidebar";
import WordPluginController, { DocumentManageStatus } from "../utils/wordPluginController";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { ThemeProvider, useTheme } from "../utils/themeContext";
import { authenticateWithPopup, checkAuthStatus, grantStorageAccess, initializeStorageAccess } from "../utils/authPopup";
import { HERMES_AUTH_REQUIRED_EVENT } from "../utils/hermesClient";

interface AppProps {
  controller: WordPluginController;
}

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    backgroundColor: DarkTheme.background.primary,
    color: DarkTheme.text.primary,
  },

  loadingDiv: {
    display: "flex",
    justifyItems: "center",
    alignContent: "center",
    alignItems: "center",
    paddingTop: "40vh",
    backgroundColor: DarkTheme.background.primary,
  },

  authContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 16px",
    textAlign: "center",
    gap: "16px",
    backgroundColor: DarkTheme.background.primary,
    minHeight: "100vh",
  },

  authTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    color: DarkTheme.text.primary,
  },

  authDescription: {
    fontSize: "14px",
    color: DarkTheme.text.secondary,
    lineHeight: "1.4",
  },

  retryContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "8px",
  },

  notManagedContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 16px",
    textAlign: "center",
    gap: "16px",
    backgroundColor: DarkTheme.background.primary,
    minHeight: "100vh",
  },

  notManagedIcon: {
    fontSize: "48px",
    color: DarkTheme.text.tertiary,
    marginBottom: "8px",
  },

  notManagedTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: DarkTheme.text.primary,
    margin: "0",
  },

  notManagedDescription: {
    fontSize: "14px",
    color: DarkTheme.text.secondary,
    lineHeight: "1.5",
    maxWidth: "300px",
  },

  notManagedActions: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "16px",
  },
});

enum DocFetchStatus {
  Loading,
  NotManaged,
  Managed,
  InternalError,
}

const AppCore: React.FC<AppProps> = ({ controller }: AppProps) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;

  const [docStatus, setDocStatus] = React.useState(DocumentManageStatus.Loading);
  const [isAuthenticating, setIsAuthenticating] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [popupAuthComplete, setPopupAuthComplete] = React.useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = React.useState(false);
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Apply data-addon-theme attribute for CSS selectors used by child components
  React.useEffect(() => {
    document.body.dataset.addonTheme = isDark ? "dark" : "light";
    return () => {
      delete document.body.dataset.addonTheme;
    };
  }, [isDark]);

  // Add global styles for Fluent UI components — re-runs when theme changes
  React.useEffect(() => {
    const style = document.createElement('style');
    style.dataset.hermesTheme = "global";
    style.textContent = `
      /* Fluent UI Input/Textarea Theme Overrides */
      .fui-Input,
      .fui-Textarea,
      input[class*="fui"],
      textarea[class*="fui"] {
        background-color: ${theme.components.input.background} !important;
        border-color: ${theme.border.primary} !important;
        color: ${theme.text.primary} !important;
      }

      .fui-Input:hover,
      .fui-Textarea:hover,
      input[class*="fui"]:hover,
      textarea[class*="fui"]:hover {
        border-color: ${theme.border.secondary} !important;
      }

      .fui-Input:focus,
      .fui-Textarea:focus,
      input[class*="fui"]:focus,
      textarea[class*="fui"]:focus,
      .fui-Input:focus-within,
      .fui-Textarea:focus-within {
        border-color: ${theme.border.focus} !important;
      }

      .fui-Input::placeholder,
      .fui-Textarea::placeholder,
      input[class*="fui"]::placeholder,
      textarea[class*="fui"]::placeholder {
        color: ${theme.components.input.placeholder} !important;
      }

      /* Field Labels */
      .fui-Field label,
      .fui-Label,
      label[class*="fui"] {
        color: ${theme.text.primary} !important;
      }

      /* Dialog/Modal Theme */
      .fui-DialogSurface,
      [class*="DialogSurface"] {
        background-color: ${theme.background.elevated} !important;
        color: ${theme.text.primary} !important;
      }

      .fui-DialogTitle,
      [class*="DialogTitle"] {
        color: ${theme.text.primary} !important;
      }

      /* Button Theme - Primary */
      .fui-Button[data-fui-appearance="primary"],
      button[class*="Button--primary"] {
        background-color: ${theme.interactive.primary} !important;
        color: ${theme.text.inverse} !important;
        border: none !important;
      }

      .fui-Button[data-fui-appearance="primary"]:hover,
      button[class*="Button--primary"]:hover {
        background-color: ${theme.interactive.primaryHover} !important;
      }

      /* Button Theme - Secondary */
      .fui-Button[data-fui-appearance="secondary"],
      button[class*="Button--secondary"] {
        background-color: transparent !important;
        color: ${theme.text.secondary} !important;
        border: 1px solid ${theme.border.primary} !important;
      }

      .fui-Button[data-fui-appearance="secondary"]:hover,
      button[class*="Button--secondary"]:hover {
        background-color: ${theme.background.tertiary} !important;
        color: ${theme.text.primary} !important;
        border-color: ${theme.border.secondary} !important;
      }

      /* Error text */
      .fui-Field__validationMessage[data-state="error"],
      [class*="validationMessage--error"] {
        color: ${theme.interactive.danger} !important;
      }

      /* Container backgrounds — override makeStyles baked-in values */
      body[data-addon-theme] #container > div,
      body[data-addon-theme] .fui-FluentProvider {
        background-color: ${theme.background.primary} !important;
        color: ${theme.text.primary} !important;
      }

      /* ── TEXT: override makeStyles-baked dark colors ── */

      /* Fluent UI Text component (renders as <span>) */
      .fui-Text {
        color: ${theme.text.primary} !important;
      }

      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        color: ${theme.text.primary} !important;
      }

      /* Anchors */
      a {
        color: ${theme.text.link} !important;
      }
      a:hover {
        color: ${theme.interactive.primaryHover} !important;
      }

      /* Force correct colors scoped to light mode only */
      body[data-addon-theme="light"] {
        color: ${theme.text.primary};
        background-color: ${theme.background.primary};
      }
      body[data-addon-theme="light"] span,
      body[data-addon-theme="light"] p,
      body[data-addon-theme="light"] label,
      body[data-addon-theme="light"] div:not([class*="fui-Portal"]):not([class*="Badge"]):not([class*="badge"]) {
        color: ${theme.text.primary};
      }
      /* Let explicit !important overrides from status badges/buttons win */
      body[data-addon-theme="light"] .fui-Text {
        color: ${theme.text.primary} !important;
      }

      /* Dropdown / listbox backgrounds in light mode */
      body[data-addon-theme="light"] .fui-Portal .fui-Dropdown__listbox,
      body[data-addon-theme="light"] [role="listbox"],
      body[data-addon-theme="light"] .fui-Listbox {
        background-color: ${theme.background.elevated} !important;
        border-color: ${theme.border.primary} !important;
        color: ${theme.text.primary} !important;
      }
      body[data-addon-theme="light"] [role="option"],
      body[data-addon-theme="light"] .fui-Option {
        background-color: ${theme.background.elevated} !important;
        color: ${theme.text.primary} !important;
      }
      body[data-addon-theme="light"] [role="option"]:hover,
      body[data-addon-theme="light"] .fui-Option:hover {
        background-color: ${theme.background.tertiary} !important;
      }

      /* Tooltip in light mode */
      body[data-addon-theme="light"] .fui-Tooltip__content {
        background-color: ${theme.components.tooltip.background} !important;
        color: ${theme.components.tooltip.text} !important;
        border-color: ${theme.components.tooltip.border} !important;
      }

      /* ── Override makeStyles-baked dark theme colors across all components ── */

      /* Input fields (EditableText, AddResourceForm, EditResourceForm) */
      .fui-Input,
      .fui-Textarea,
      [class*="input"],
      [class*="textarea"] {
        background-color: ${theme.components.input.background} !important;
        border-color: ${theme.border.primary} !important;
        color: ${theme.text.primary} !important;
      }
      .fui-Input input,
      .fui-Textarea textarea {
        color: ${theme.text.primary} !important;
      }

      /* Labels in sections */
      [class*="label"] {
        color: ${theme.text.tertiary};
      }

      /* Value text */
      [class*="value"] {
        color: ${theme.text.primary};
      }

      /* Edit icon */
      [class*="editIcon"],
      [class*="closeIcon"] {
        color: ${theme.text.tertiary} !important;
      }

      /* Primary buttons */
      [class*="primaryButton"] {
        background-color: ${theme.interactive.primary} !important;
        color: ${theme.text.inverse} !important;
      }
      [class*="primaryButton"]:hover {
        background-color: ${theme.interactive.primaryHover} !important;
      }

      /* Secondary buttons */
      [class*="secondaryButton"] {
        color: ${theme.text.secondary} !important;
        border-color: ${theme.border.primary} !important;
      }

      /* Clickable field hover override */
      [class*="clickableField"]:hover {
        background-color: ${theme.background.tertiary} !important;
      }

      /* Add resource form - addButton and helpText */
      [class*="addButton"] {
        background-color: ${theme.interactive.primary} !important;
        color: ${theme.text.inverse} !important;
      }

      /* Help text */
      [class*="helpText"] {
        color: ${theme.text.tertiary} !important;
      }

      /* Field labels in forms */
      .fui-Field label,
      .fui-Label,
      [class*="fieldLabel"] label {
        color: ${theme.text.primary} !important;
      }

      /* Document action icons */
      [class*="documentIcon"] {
        color: ${theme.interactive.primary} !important;
      }
      [class*="linkIcon"],
      [class*="openButton"] {
        color: ${theme.text.tertiary} !important;
      }
      [class*="editButton"] {
        color: ${theme.interactive.primary} !important;
      }
      [class*="removeButton"] {
        color: ${theme.interactive.danger} !important;
      }

      /* Header link */
      [class*="navHermesLink"] {
        color: ${theme.components.header.linkColor} !important;
      }
      [class*="navHermesLink"]:hover {
        color: ${theme.components.header.linkHover} !important;
      }

      /* Share button */
      [class*="shareButton"] {
        color: ${theme.text.secondary} !important;
      }

      /* Error text */
      [class*="errorText"] {
        color: ${theme.interactive.danger} !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [isDark]);

  React.useEffect(() => {
    (async () => {
      try {
        const baseUrl = controller.getHermesBaseUrl();
        await initializeStorageAccess(baseUrl);
        const sts = await controller.checkDocumentManageStatus();
        setDocStatus(sts);
      } catch (error) {
        console.error("Failed to initialize storage access or fetch document manage status:", error);
        setDocStatus(DocumentManageStatus.Error);
      } finally {
        setIsInitializing(false);
      }
    })()
  }, []);

  React.useEffect(() => {
    const handleAuthRequired = () => {
      setAuthError(null);
      setIsAuthenticating(false);
      setIsGrantingAccess(false);
      setPopupAuthComplete(false);
      setDocStatus(DocumentManageStatus.AuthenticationRequired);
    };

    window.addEventListener(HERMES_AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => {
      window.removeEventListener(HERMES_AUTH_REQUIRED_EVENT, handleAuthRequired);
    };
  }, []);

  /**
   * Step 1: Open popup for ALB OIDC authentication.
   * After popup closes, we need a separate user click for Storage Access API.
   */
  const handleSignInWithPopup = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setPopupAuthComplete(false);

    try {
      const baseUrl = controller.getHermesBaseUrl();
      const authUrl = `${baseUrl}/authenticate?init=true&popup=true`;

      const result = await authenticateWithPopup(authUrl);

      if (result.success) {
        setIsAuthenticating(false);
        
        const storageAccessGranted = await grantStorageAccess(baseUrl);
        
        if (storageAccessGranted) {
          const newStatus = await controller.checkDocumentManageStatus();
          setDocStatus(newStatus);
          setPopupAuthComplete(false);
        } else {
          setPopupAuthComplete(true);
        }
      } else {
        setAuthError(result.error || 'Authentication failed');
        setIsAuthenticating(false);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setIsAuthenticating(false);
    }
  };

  /**
   * Step 2: Grant storage access and verify auth.
   * This MUST be called directly from a button click (user gesture).
   * Safari requires this for requestStorageAccess() to work.
   */
  const handleGrantStorageAccess = async () => {
    setIsGrantingAccess(true);
    setAuthError(null);

    try {
      const baseUrl = controller.getHermesBaseUrl();
      const storageAccessGranted = await grantStorageAccess(baseUrl);

      if (!storageAccessGranted) {
        setAuthError('Cookie access was not granted. Please click the button again and allow access when prompted by the browser.');
        return;
      }

      const newStatus = await controller.checkDocumentManageStatus();
      setDocStatus(newStatus);
      setPopupAuthComplete(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const renderBody = () => {
    if (isInitializing) {
      return (
        <div className={styles.loadingDiv}>
          <ProgressBar thickness="large" content="Initializing..." />
        </div>
      );
    }

    switch (docStatus) {
      case DocumentManageStatus.Loading:
        return (
          <div className={styles.loadingDiv}>
            <ProgressBar thickness="large" content="Loading..." />
          </div>
        );
      case DocumentManageStatus.Managed:
        return <Sidebar controller={controller} />;
      case DocumentManageStatus.Error:
        return <h1>Something went wrong</h1>;
      case DocumentManageStatus.NotManaged:
        return (
          <div className={styles.notManagedContainer}>
            <div className={styles.notManagedIcon}>📄</div>
            <Text className={styles.notManagedTitle}>
              Document Not Managed
            </Text>
            <Text className={styles.notManagedDescription}>
              This document is not managed by Hermes. To enable document
              management features like metadata tracking, approvals, and collaboration,
              please create document through Hermes.
            </Text>
            <div className={styles.notManagedActions}>
              <Button
                appearance="primary"
                onClick={() => window.open(controller.getHermesBaseUrl(), '_blank')}
              >
                Open Hermes
              </Button>
            </div>
          </div>
        );
      case DocumentManageStatus.AuthenticationRequired:
        return (
          <div className={styles.authContainer}>
            <Text className={styles.authTitle}>Authentication Required</Text>

            {!popupAuthComplete ? (
              // Step 1: Sign In
              <>
                <Text className={styles.authDescription}>
                  You need to sign in to Hermes to manage this document.
                  A secure popup window will open for authentication.
                </Text>
                <Button
                  appearance="primary"
                  onClick={handleSignInWithPopup}
                  disabled={isAuthenticating}
                >
                  {isAuthenticating ? "Authenticating..." : "Sign In to Hermes"}
                </Button>
                {isAuthenticating && (
                  <div className={styles.retryContainer}>
                    <ProgressBar thickness="medium" />
                    <Text style={{ fontSize: "12px", color: theme.text.tertiary }}>
                      Please complete sign-in in the popup window, then close it...
                    </Text>
                  </div>
                )}
              </>
            ) : (
              // Step 2: Grant Storage Access
              <>
                <Text className={styles.authDescription}>
                  ✓ Sign-in complete! Now click below to allow cookie access.
                  This is required for the add-in to access your session.
                </Text>
                <Button
                  appearance="primary"
                  onClick={handleGrantStorageAccess}
                  disabled={isGrantingAccess}
                >
                  {isGrantingAccess ? "Granting Access..." : "Grant Cookie Access"}
                </Button>
                {isGrantingAccess && (
                  <div className={styles.retryContainer}>
                    <ProgressBar thickness="medium" />
                    <Text style={{ fontSize: "12px", color: theme.text.tertiary }}>
                      Verifying access...
                    </Text>
                  </div>
                )}
              </>
            )}

            {authError && (
              <Text style={{ 
                fontSize: "12px", 
                color: theme.text.error, 
                marginTop: "8px",
                textAlign: "center"
              }}>
                {authError}
              </Text>
            )}
          </div>
        );
      default:
        return (
          <div className={styles.loadingDiv}>
            <ProgressBar thickness="large" content="Loading..." />
          </div>
        );
    }
  };

  // The list items are static and won't change at runtime,
  // so this should be an ordinary const, not a part of state.

  return (
    <div
      className={styles.root}
      style={{ backgroundColor: theme.background.primary, color: theme.text.primary }}
    >
      {renderBody()}
    </div>
  );
};

/**
 * App is the top-level component that provides the ThemeContext and FluentProvider.
 * AppCore handles all business logic and rendering.
 */
const App: React.FC<AppProps> = ({ controller }) => {
  return (
    <ThemeProvider>
      <AppInner controller={controller} />
    </ThemeProvider>
  );
};

/**
 * AppInner reads the theme from context to configure FluentProvider,
 * then renders AppCore.
 */
const AppInner: React.FC<AppProps> = ({ controller }) => {
  const { isDark } = useTheme();
  return (
    <FluentProvider theme={isDark ? webDarkTheme : webLightTheme}>
      <AppCore controller={controller} />
    </FluentProvider>
  );
};

export default App;
