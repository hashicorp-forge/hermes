export interface HdsAnchorComponentArgs {
  icon?: string;
  iconPosition?: HdsIconPosition;
  href?: string;
  isHrefExternal?: boolean;
  route?: string;
  models?: unknown[];
  model?: unknown;
  query?: Record<string, unknown>;
  "current-when"?: string;
  replace?: boolean;
}

export type HdsAlertColor =
  | "neutral"
  | "highlight"
  | "success"
  | "warning"
  | "critical";

export type HdsBadgeColor =
  | "neutral"
  | "neutral-dark-more"
  | "highlight"
  | "critical"
  | "success"
  | "warning";
export type HdsBadgeCountColor = "neutral" | "neutral-dark-more";
export type HdsBadgeType = "filled" | "inverted" | "outlined";
export type HdsButtonColor = "primary" | "secondary" | "tertiary" | "critical";

export type HdsCardBackgroundColor = "neutral-primary" | "neutral-secondary";
export type HdsComponentOverflow = "hidden" | "visible";
export type HdsComponentSize = "small" | "medium" | "large";
export type HdsComponentShadowLevel = "base" | "mid" | "high";

export type HdsFormFieldLayout = "vertical" | "flag";

export type HdsIconPosition = "leading" | "trailing";
export type HdsIconTileColor =
  | "neutral"
  | "boundary"
  | "consul"
  | "nomad"
  | "packer"
  | "terraform"
  | "vagrant"
  | "vault"
  | "waypoint";

export type HdsLinkColor = "primary" | "secondary";

export type HdsModalColor = "neutral" | "warning" | "critical";

export type HdsProductLogoName =
  | "hcp"
  | "boundary"
  | "consul"
  | "nomad"
  | "packer"
  | "terraform"
  | "vagrant"
  | "vault"
  | "waypoint";

export type HdsTableDensity = "short" | "medium" | "tall";
export type HdsTableHorizontalAlignment = "left" | "center" | "right";
export type HdsTableSortOrder = "asc" | "desc";
export type HdsTableVerticalAlignment = "top" | "middle";
