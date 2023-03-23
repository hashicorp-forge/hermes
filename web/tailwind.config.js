module.exports = {
  content: ["./app/**/*.{html,js,hbs}"],
  theme: {
    fontSize: {
      "display-500": [
        "var(--token-typography-display-500-font-size)",
        "var(--token-typography-display-500-line-height)",
      ],
      "display-400": [
        "var(--token-typography-display-400-font-size)",
        "var(--token-typography-display-400-line-height)",
      ],
      "display-300": [
        "var(--token-typography-display-300-font-size)",
        "var(--token-typography-display-300-line-height)",
      ],
      "display-200": [
        "var(--token-typography-display-200-font-size)",
        "var(--token-typography-display-200-line-height)",
      ],
      "display-100": [
        "var(--token-typography-display-100-font-size)",
        "var(--token-typography-display-100-line-height)",
      ],

      "body-300": [
        "var(--token-typography-body-300-font-size)",
        "var(--token-typography-body-300-line-height)",
      ],
      "body-200": [
        "var(--token-typography-body-200-font-size)",
        "var(--token-typography-body-200-line-height)",
      ],
      "body-100": [
        "var(--token-typography-body-100-font-size)",
        "var(--token-typography-body-100-line-height)",
      ],
    },
    fontWeight: {
      regular: "var(--token-typography-font-weight-regular)",
      medium: "var(--token-typography-font-weight-medium)",
      semibold: "var(--token-typography-font-weight-semibold)",
      bold: "var(--token-typography-font-weight-bold)",
    },
    extend: {
      boxShadow: {
        "surface-low": "var(--token-surface-low-box-shadow)",
        "surface-mid": "var(--token-surface-mid-box-shadow)",
      },
      colors: {
        // Note: Because the tokens are HEX and not RGB values,
        // they can't be used with Tailwind's opacity modifiers
        // https://tailwindcss.com/docs/customizing-colors#using-css-variables

        // Surface
        "color-surface-action": "var(--token-color-surface-action)",
        "color-surface-critical": "var(--token-color-surface-critical)",
        "color-surface-faint": "var(--token-color-surface-faint)",
        "color-surface-highlight": "var(--token-color-surface-highlight)",
        "color-surface-interactive": "var(--token-color-surface-interactive)",
        "color-surface-interactive-hover":
          "var(--token-color-surface-interactive-hover)",
        "color-surface-primary": "var(--token-color-surface-primary)",
        "color-surface-strong": "var(--token-color-surface-strong)",
        "color-surface-warning": "var(--token-color-surface-warning)",

        // Border
        "color-border-faint": "var(--token-color-border-faint)",
        "color-border-critical": "var(--token-color-border-critical)",
        "color-border-faint": "var(--token-color-border-faint)",
        "color-border-primary": "var(--token-color-border-primary)",
        "color-border-strong": "var(--token-color-border-strong)",
        "color-border-warning": "var(--token-color-border-warning)",

        // Page
        "color-page-faint": "var(--token-color-page-faint)",
        "color-page-primary": "var(--token-color-page-primary)",

        // Foreground
        "color-foreground-action": "var(--token-color-foreground-action)",
        "color-foreground-action-hover":
          "var(--token-color-foreground-action-hover)",
        "color-foreground-action-active":
          "var(--token-color-foreground-action-active)",
        "color-foreground-critical": "var(--token-color-foreground-critical)",
        "color-foreground-critical-on-surface":
          "var(--token-color-foreground-critical-on-surface)",
        "color-foreground-disabled": "var(--token-color-foreground-disabled)",
        "color-foreground-faint": "var(--token-color-foreground-faint)",
        "color-foreground-high-contrast":
          "var(--token-color-foreground-high-contrast)",
        "color-foreground-highlight": "var(--token-color-foreground-highlight)",
        "color-foreground-primary": "var(--token-color-foreground-primary)",
        "color-foreground-strong": "var(--token-color-foreground-strong)",
        "color-foreground-warning": "var(--token-color-foreground-warning)",
        "color-foreground-warning-on-surface":
          "var(--token-color-foreground-warning-on-surface)",

        // Product - Boundary
        "color-boundary-foreground": "var(--token-color-boundary-foreground)",
        "color-boundary-gradient-primary-start":
          "var(--token-color-boundary-gradient-primary-start)",
        "color-boundary-gradient-primary-stop":
          "var(--token-color-boundary-gradient-primary-stop)",

        // Product - Nomad
        "color-nomad-foreground": "var(--token-color-nomad-foreground)",
        "color-nomad-gradient-primary-start":
          "var(--token-color-nomad-gradient-primary-start)",
        "color-nomad-gradient-primary-stop":
          "var(--token-color-nomad-gradient-primary-stop)",

        // Product - Consul
        "color-consul-foreground": "var(--token-color-consul-foreground)",
        "color-consul-gradient-primary-start":
          "var(--token-color-consul-gradient-primary-start)",
        "color-consul-gradient-primary-stop":
          "var(--token-color-consul-gradient-primary-stop)",

        // Product - Packer
        "color-packer-foreground": "var(--token-color-packer-foreground)",
        "color-packer-gradient-primary-start":
          "var(--token-color-packer-gradient-primary-start)",
        "color-packer-gradient-primary-stop":
          "var(--token-color-packer-gradient-primary-stop)",

        // Product - Terraform
        "color-terraform-foreground": "var(--token-color-terraform-foreground)",
        "color-terraform-gradient-primary-start":
          "var(--token-color-terraform-gradient-primary-start)",
        "color-terraform-gradient-primary-stop":
          "var(--token-color-terraform-gradient-primary-stop)",

        // Product - Vagrant
        "color-vagrant-foreground": "var(--token-color-vagrant-foreground)",
        "color-vagrant-gradient-primary-start":
          "var(--token-color-vagrant-gradient-primary-start)",
        "color-vagrant-gradient-primary-stop":
          "var(--token-color-vagrant-gradient-primary-stop)",

        // Product - Vault
        "color-vault-foreground": "var(--token-color-vault-foreground)",
        "color-vault-gradient-primary-start":
          "var(--token-color-vault-gradient-primary-start)",
        "color-vault-gradient-primary-stop":
          "var(--token-color-vault-gradient-primary-stop)",

        // Product - Waypoint
        "color-waypoint-foreground": "var(--token-color-waypoint-foreground)",
        "color-waypoint-gradient-primary-start":
          "var(--token-color-waypoint-gradient-primary-start)",
        "color-waypoint-gradient-primary-stop":
          "var(--token-color-waypoint-gradient-primary-stop)",

        // Focus Action
        "color-focus-action-external":
          "var(--token-color-focus-action-external)",
        "color-focus-action-internal":
          "var(--token-color-focus-action-internal)",

        // Neutral
        "color-palette-neutral-50": "var(--token-color-palette-neutral-50)",
        "color-palette-neutral-100": "var(--token-color-palette-neutral-100)",
        "color-palette-neutral-200": "var(--token-color-palette-neutral-200)",
        "color-palette-neutral-300": "var(--token-color-palette-neutral-300)",
        "color-palette-neutral-400": "var(--token-color-palette-neutral-400)",
        "color-palette-neutral-500": "var(--token-color-palette-neutral-500)",
        "color-palette-neutral-600": "var(--token-color-palette-neutral-600)",
        "color-palette-neutral-700": "var(--token-color-palette-neutral-700)",

        // Non-Semantic Color
        "color-palette-blue-200": "var(--token-color-palette-blue-200)",
        "color-palette-green-200": "var(--token-color-palette-green-200)",
        "color-palette-purple-100": "var(--token-color-palette-purple-100)",
        "color-palette-purple-200": "var(--token-color-palette-purple-200)",
      },
    },
  },
  plugins: [],
  corePlugins: {
    // Disable Tailwind's preflight to prevent clashes
    // with @hashicorp/design-system-components
    preflight: false,
  },
};
