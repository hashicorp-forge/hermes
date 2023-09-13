/**
 * Used by Action and LinkTo
 */
export type XDropdownListInteractiveComponentArgs = {
  registerElement: (e: HTMLElement) => void;
  focusMouseTarget: (e: MouseEvent) => void;
  onClick: () => void;
  disabled?: boolean;
  role: string;
  isAriaSelected: boolean;
  isAriaChecked: boolean;
};

/**
 * Used by Index, Items and BadgeDropdownList
 */
export interface XDropdownListSharedArgs {
  items?: any;
  groups?: any;
  selected?: any;
  listIsOrdered?: boolean;
}

/**
 * Used by ToggleAction, ToggleSelect and ToggleButton
 */
export interface XDropdownListToggleComponentArgs {
  registerAnchor: (e: HTMLElement) => void;
  onTriggerKeydown: (e: KeyboardEvent) => void;
  toggleContent: () => void;
  contentIsShown: boolean;
  ariaControls: string;
  disabled?: boolean;
  isLoading?: boolean;
}
