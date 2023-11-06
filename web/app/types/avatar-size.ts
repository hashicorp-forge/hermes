export enum HermesBasicAvatarSize {
  Small = "small",
  Medium = "medium",
  Large = "large",
}

export enum HermesExtendedAvatarSize {
  XL = "xl",
}

export type HermesPersonAvatarSize =
  | HermesBasicAvatarSize
  | HermesExtendedAvatarSize;
