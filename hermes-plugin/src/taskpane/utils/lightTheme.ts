/**
 * Light Mode Theme Constants for Hermes Word Add-in
 * Mirrors the structure of DarkTheme so components can swap themes seamlessly.
 */

export const LightTheme = {
  // Primary background colors
  background: {
    primary: "#ffffff",        // White main background
    secondary: "#f5f5f5",      // Slightly off-white for cards/panels
    tertiary: "#ebebeb",       // Hover states
    elevated: "#ffffff",       // Elevated surfaces like modals
    subtle: "#fafafa",         // Subtle variations
    error: "#fef2f2",          // Error container background
    success: "#22c55e",        // Success indicator background
  },

  // Text colors with proper contrast
  text: {
    primary: "#111827",        // Near-black primary text
    secondary: "#374151",      // Dark gray secondary text
    tertiary: "#6b7280",       // Mid-gray labels/hints
    disabled: "#9ca3af",       // Disabled state text
    inverse: "#ffffff",        // White text for dark backgrounds
    placeholder: "#9ca3af",    // Placeholder/empty state text
    error: "#dc2626",          // Error message text
    link: "#0078d4",           // Hyperlink text
  },

  // Border and divider colors
  border: {
    primary: "#d1d5db",        // Main border color
    secondary: "#9ca3af",      // Darker borders for hover
    subtle: "#e5e7eb",         // Very subtle borders
    focus: "#0078d4",          // Focus states (Microsoft blue)
  },

  // Interactive element colors (same as dark for brand consistency)
  interactive: {
    primary: "#0078d4",
    primaryHover: "#106ebe",
    secondary: "#e5e7eb",
    secondaryHover: "#d1d5db",
    danger: "#dc2626",
    dangerHover: "#b91c1c",
    success: "#16a34a",
    successHover: "#15803d",
    warning: "#d97706",
    warningHover: "#b45309",
  },

  // Status-specific colors (matching Ember frontend HDS design system)
  status: {
    approved: {
      background: "#f2fbf6",      // HDS success surface
      text: "#00781e",            // HDS success foreground
      border: "#86efac",
    },
    inReview: {
      background: "#f9f2ff",      // HDS highlight surface
      text: "#911ced",            // HDS highlight foreground
      border: "#d8b4fe",
    },
    draft: {
      background: "#f1f2f3",      // HDS neutral surface
      text: "#3b3d45",            // HDS neutral foreground
      border: "#d1d5db",
    },
    obsolete: {
      background: "#f1f2f3",      // HDS neutral surface
      text: "#3b3d45",            // HDS neutral foreground
      border: "#d1d5db",
    },
    warning: {
      background: "#fff7ed",
      text: "#ea580c",
      border: "#fdba74",
    },
  },

  // State overlays
  states: {
    hover: "rgba(0, 0, 0, 0.06)",
    focus: "0 0 0 2px #0078d4",
    active: "rgba(0, 0, 0, 0.12)",
    disabled: "rgba(0, 0, 0, 0.15)",
  },

  // Shadows and elevation
  shadows: {
    small: "0 1px 3px rgba(0, 0, 0, 0.1)",
    medium: "0 2px 8px rgba(0, 0, 0, 0.12)",
    large: "0 4px 16px rgba(0, 0, 0, 0.15)",
  },

  // Gradients
  gradients: {
    subtle: "linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)",
    accent: "linear-gradient(135deg, #0078d4 0%, #106ebe 100%)",
  },

  // Component-specific colors
  components: {
    card: {
      background: "#ffffff",
      border: "#e5e7eb",
      shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    },
    input: {
      background: "#ffffff",
      border: "#d1d5db",
      focusBorder: "#0078d4",
      text: "#111827",
      placeholder: "#9ca3af",
    },
    dropdown: {
      background: "#ffffff",
      border: "#d1d5db",
      optionHover: "#f3f4f6",
      text: "#111827",
    },
    button: {
      primary: {
        background: "#0078d4",
        backgroundHover: "#106ebe",
        text: "#ffffff",
      },
      secondary: {
        background: "transparent",
        backgroundHover: "#f3f4f6",
        text: "#374151",
        border: "#d1d5db",
      },
      danger: {
        background: "transparent",
        backgroundHover: "#fef2f2",
        text: "#dc2626",
        border: "#dc2626",
      },
    },
    badge: {
      background: "#f3f4f6",
      text: "#374151",
      border: "#d1d5db",
    },
    progressBar: {
      background: "#e5e7eb",
      fill: "#0078d4",
    },
    tooltip: {
      background: "#ffffff",
      text: "#111827",
      border: "#d1d5db",
    },
    header: {
      background: "#ffffff",
      border: "#e5e7eb",
      text: "#111827",
      linkColor: "#0078d4",
      linkHover: "#106ebe",
    },
    footer: {
      background: "#ffffff",
      border: "#e5e7eb",
      text: "#6b7280",
    },
  },
};

export default LightTheme;
