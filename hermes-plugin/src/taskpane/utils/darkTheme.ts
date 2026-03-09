/**
 * Dark Mode Theme Constants for Hermes Word Add-in
 * Maintains consistency across all components while providing a cool, modern dark theme
 */

export const DarkTheme = {
  // Primary background colors
  background: {
    primary: "#1a1a1a",        // Main dark background
    secondary: "#242424",      // Slightly lighter for cards/panels
    tertiary: "#2d2d2d",       // Even lighter for hover states
    elevated: "#333333",       // Elevated surfaces like modals
    subtle: "#1f1f1f",         // Subtle variations
    error: "#3d1a1a",          // Error container background
    success: "#22c55e",        // Success indicator background
  },

  // Text colors with proper contrast
  text: {
    primary: "#ffffff",        // Primary white text
    secondary: "#e0e0e0",      // Secondary lighter gray
    tertiary: "#b0b0b0",       // Tertiary for labels/hints
    disabled: "#666666",       // Disabled state text
    inverse: "#1a1a1a",        // Dark text for light backgrounds
    placeholder: "#6b7280",    // Placeholder/empty state text
    error: "#ff6b6b",          // Error message text
    link: "#0078d4",           // Hyperlink text
  },

  // Border and divider colors
  border: {
    primary: "#404040",        // Main border color
    secondary: "#4a4a4a",      // Lighter borders for hover
    subtle: "#353535",         // Very subtle borders
    focus: "#0078d4",          // Focus states (keeping Microsoft blue)
  },

  // Interactive element colors
  interactive: {
    primary: "#0078d4",        // Microsoft blue for primary actions
    primaryHover: "#106ebe",   // Darker blue for hover
    secondary: "#404040",      // Secondary buttons
    secondaryHover: "#4a4a4a", // Secondary hover
    danger: "#d83b01",         // Delete/danger actions
    dangerHover: "#c23000",    // Danger hover
    success: "#107c10",        // Success/approval states
    successHover: "#0e6e0e",   // Success hover
    warning: "#ff8c00",        // Warning states
    warningHover: "#e67c00",   // Warning hover
  },

  // Status-specific colors (maintaining semantic meaning)
  status: {
    approved: {
      background: "#1a3d1a",    // Dark green background
      text: "#4ade80",          // Light green text
      border: "#2d5a2d",        // Green border
    },
    inReview: {
      background: "#2d1b3d",    // Dark purple background
      text: "#c084fc",          // Light purple text
      border: "#4a2d5a",        // Purple border
    },
    draft: {
      background: "#3d2a1a",    // Dark orange background
      text: "#fb923c",          // Light orange text
      border: "#5a3d2d",        // Orange border
    },
    obsolete: {
      background: "#2d2d2d",    // Neutral gray background
      text: "#9ca3af",          // Gray text
      border: "#404040",        // Gray border
    },
    warning: {
      background: "#3d2a1a",    // Dark orange background
      text: "#fb923c",          // Light orange text
      border: "#5a3d2d",        // Orange border
    },
  },

  // Component-specific styles
  components: {
    // Cards and containers
    card: {
      background: "#242424",
      border: "#404040",
      shadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    },
    
    // Form inputs
    input: {
      background: "#2d2d2d",
      border: "#404040",
      focusBorder: "#0078d4",
      text: "#ffffff",
      placeholder: "#888888",
    },
    
    // Dropdowns and selects
    dropdown: {
      background: "#2d2d2d",
      border: "#404040",
      optionHover: "#404040",
      text: "#ffffff",
    },
    
    // Buttons
    button: {
      primary: {
        background: "#0078d4",
        backgroundHover: "#106ebe",
        text: "#ffffff",
      },
      secondary: {
        background: "transparent",
        backgroundHover: "#404040",
        text: "#e0e0e0",
        border: "#404040",
      },
    },
    
    // Progress bars
    progressBar: {
      background: "#404040",
      fill: "#0078d4",
    },
    
    // Tooltips
    tooltip: {
      background: "#1f1f1f",
      text: "#ffffff",
      border: "#404040",
    },

    // Header and navigation
    header: {
      background: "#1a1a1a",
      border: "#404040",
      text: "#ffffff",
      linkColor: "#4fc3f7",  // Cool blue for links
      linkHover: "#29b6f6",
    },

    // Footer
    footer: {
      background: "#1a1a1a",
      border: "#404040",
      text: "#b0b0b0",
    },
  },

  // Hover and focus states
  states: {
    hover: "rgba(255, 255, 255, 0.1)",
    focus: "0 0 0 2px #0078d4",
    active: "rgba(255, 255, 255, 0.2)",
    disabled: "rgba(255, 255, 255, 0.3)",
  },

  // Shadows and elevation
  shadows: {
    small: "0 1px 3px rgba(0, 0, 0, 0.3)",
    medium: "0 2px 8px rgba(0, 0, 0, 0.3)",
    large: "0 4px 16px rgba(0, 0, 0, 0.4)",
  },

  // Gradients for special elements
  gradients: {
    subtle: "linear-gradient(135deg, #1a1a1a 0%, #242424 100%)",
    accent: "linear-gradient(135deg, #0078d4 0%, #106ebe 100%)",
  },
};

// Utility function to get contrast color
export function getContrastColor(): string {
  // For dark theme, we generally use light text
  return DarkTheme.text.primary;
}

// Utility function to create hover styles
export function createHoverStyle(baseColor: string, hoverColor: string) {
  return {
    backgroundColor: baseColor,
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: hoverColor,
    },
  };
}

// Utility function for focus styles
export function createFocusStyle() {
  return {
    ":focus": {
      outline: "none",
      boxShadow: DarkTheme.states.focus,
    },
  };
}

/**
 * Fluent UI Theme Tokens
 * These tokens can be used to override Fluent UI component defaults.
 * Apply these when wrapping your app with FluentProvider.
 */
export const FluentDarkTheme = {
  colorNeutralBackground1: DarkTheme.background.primary,
  colorNeutralBackground2: DarkTheme.background.secondary,
  colorNeutralBackground3: DarkTheme.background.tertiary,
  colorNeutralForeground1: DarkTheme.text.primary,
  colorNeutralForeground2: DarkTheme.text.secondary,
  colorNeutralForeground3: DarkTheme.text.tertiary,
  colorNeutralStroke1: DarkTheme.border.primary,
  colorNeutralStroke2: DarkTheme.border.secondary,
  colorBrandBackground: DarkTheme.interactive.primary,
  colorBrandBackgroundHover: DarkTheme.interactive.primaryHover,
  colorBrandForeground1: DarkTheme.text.primary,
};

/**
 * Common style utilities for consistent theming across components.
 * 
 * Use these base styles in your makeStyles definitions to maintain consistency:
 * 
 * @example
 * ```typescript
 * import { commonStyles } from "../utils/darkTheme";
 * 
 * const useStyles = makeStyles({
 *   myButton: commonStyles.primaryButton,
 *   myCustomButton: {
 *     ...commonStyles.secondaryButton,
 *     width: "100%", // Add custom properties
 *   },
 * });
 * ```
 */
export const commonStyles = {
  // Input field styles
  inputField: {
    backgroundColor: DarkTheme.components.input.background,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
    color: DarkTheme.text.primary,
    "&::placeholder": {
      color: DarkTheme.components.input.placeholder,
    },
    "&:hover": {
      borderColor: DarkTheme.border.secondary,
    },
    "&:focus": {
      borderColor: DarkTheme.border.focus,
      outline: "none",
    },
  },
  
  // Field label styles
  fieldLabel: {
    color: DarkTheme.text.primary,
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "4px",
  },
  
  // Primary button (Save, Submit, etc.)
  primaryButton: {
    backgroundColor: DarkTheme.interactive.primary,
    color: DarkTheme.text.primary,
    border: "none",
    borderRadius: "4px",
    fontWeight: "600",
    "&:hover": {
      backgroundColor: DarkTheme.interactive.primaryHover,
    },
    "&:active": {
      backgroundColor: DarkTheme.interactive.primaryHover,
    },
  },
  
  // Secondary button (Cancel, Close, etc.)
  secondaryButton: {
    backgroundColor: "transparent",
    color: DarkTheme.text.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
    fontWeight: "500",
    "&:hover": {
      backgroundColor: DarkTheme.background.tertiary,
      color: DarkTheme.text.primary,
      borderColor: DarkTheme.border.secondary,
    },
  },
  
  // Danger/Delete button
  dangerButton: {
    backgroundColor: "transparent",
    color: DarkTheme.interactive.danger,
    border: `1px solid ${DarkTheme.interactive.danger}`,
    borderRadius: "4px",
    fontWeight: "500",
    "&:hover": {
      backgroundColor: "#3d1a1a",
      borderColor: DarkTheme.interactive.dangerHover,
    },
  },
  
  // Icon buttons (checkmark, dismiss, etc.)
  iconButton: {
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "4px",
    minWidth: "32px",
    minHeight: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: DarkTheme.background.tertiary,
    },
  },
  
  // Primary icon button (for save/checkmark)
  primaryIconButton: {
    backgroundColor: DarkTheme.interactive.primary,
    color: DarkTheme.text.primary,
    border: "none",
    borderRadius: "4px",
    minWidth: "32px",
    minHeight: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: DarkTheme.interactive.primaryHover,
    },
  },
  
  // Secondary icon button (for cancel/dismiss)
  secondaryIconButton: {
    backgroundColor: "transparent",
    color: DarkTheme.text.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
    minWidth: "32px",
    minHeight: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: DarkTheme.background.tertiary,
      color: DarkTheme.text.primary,
      borderColor: DarkTheme.border.secondary,
    },
  },
  
  // Tag picker control (for People and Groups components)
  tagPickerControl: {
    backgroundColor: DarkTheme.background.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    color: DarkTheme.text.primary,
    flexWrap: "wrap" as const,
    minHeight: "44px",
    padding: "4px",
    gap: "4px",
  },
  
  // Tag picker group
  tagPickerGroup: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
  },
  
  // Tag picker list
  tagPickerList: {
    backgroundColor: DarkTheme.background.elevated,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
  },
};

/**
 * Spacing constants for consistent layout across components
 */
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  xxl: "32px",
};

/**
 * Font size constants
 */
export const fontSize = {
  xs: "10px",
  sm: "12px",
  md: "14px",
  lg: "16px",
  xl: "18px",
  xxl: "20px",
};

/**
 * Border radius constants
 */
export const borderRadius = {
  sm: "4px",
  md: "6px",
  lg: "8px",
  round: "50%",
};

// Export default theme
export default DarkTheme;