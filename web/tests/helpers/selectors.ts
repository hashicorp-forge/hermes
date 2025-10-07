/**
 * Shared test selectors to eliminate duplication across test files.
 * Use these constants instead of defining them in individual test files.
 */

// Flash messages and notifications
export const FLASH_MESSAGE = "[data-test-flash-notification]";

// Tooltips
export const TOOLTIP = ".hermes-tooltip";

// Modals and dialogs
export const POPOVER = "[data-test-x-dropdown-list-content]";

// Dropdown and select components
export const TOGGLE_SELECT = "[data-test-x-dropdown-list-toggle-select]";
export const TOGGLE_BUTTON = "[data-test-x-dropdown-list-toggle-button]";
export const TOGGLE_ACTION = "[data-test-x-dropdown-list-toggle-action]";
export const TOGGLE_ACTION_CHEVRON = "[data-test-toggle-action-chevron]";
export const LINK_TO = "[data-test-x-dropdown-list-item-link-to]";
export const EXTERNAL_LINK = "[data-test-x-dropdown-list-item-external-link]";
export const FILTER_INPUT = "[data-test-x-dropdown-list-input]";
export const LOADED_CONTENT = "[data-test-x-dropdown-list-loaded-content]";
export const LOADING_BLOCK = "[data-test-x-dropdown-list-loading-block]";
export const DEFAULT_NO_MATCHES = ".x-dropdown-list-default-empty-state";
export const DEFAULT_LOADER = ".x-dropdown-list-default-loading-container";

// Document fields
export const DOCUMENT_TITLE = "[data-test-document-title]";
export const DOCUMENT_SUMMARY = "[data-test-document-summary]";
export const DOCUMENT_CONTRIBUTORS = "[data-test-document-contributors]";
export const DOCUMENT_APPROVERS = "[data-test-document-approvers]";

// Product selection
export const PRODUCT_SELECT = "[data-test-product-select]";
export const PRODUCT_VALUE = "[data-test-product-value]";
export const PRODUCT_SELECT_ITEM = `${POPOVER} [data-test-product-select-item]`;

// People selection
export const PEOPLE_SELECT_INPUT = ".ember-power-select-trigger-multiple-input";
export const PEOPLE_SELECT_OPTION = ".ember-power-select-option:not(.ember-power-select-option--no-matches-message)";
export const PEOPLE_SELECT_REMOVE_BUTTON = "[data-test-people-select-remove-button]";

// Editable fields
export const EDITABLE_FIELD_READ_VALUE = "[data-test-editable-field-read-value]";
export const EDITABLE_FIELD_SAVE_BUTTON = "[data-test-editable-field-save-button]";

// Custom fields
export const CUSTOM_STRING_FIELD = "[data-test-custom-field-type='string']";
export const CUSTOM_PEOPLE_FIELD = "[data-test-custom-field-type='people']";

// Related resources
export const RELATED_DOCUMENT_OPTION = ".related-document-option";
export const ADD_RELATED_RESOURCES_SEARCH_INPUT = "[data-test-add-related-resources-search-input]";
export const NO_RESOURCES_FOUND = "[data-test-no-related-resources-found]";
export const ADD_RESOURCE_MODAL = "[data-test-add-related-resource-modal]";

// External resources
export const EXTERNAL_RESOURCE_TITLE_INPUT = ".external-resource-title-input";

// Draft visibility
export const DRAFT_VISIBILITY_DROPDOWN = "[data-test-draft-visibility-dropdown]";
export const DRAFT_VISIBILITY_TOGGLE = "[data-test-draft-visibility-toggle]";
export const DRAFT_VISIBILITY_READ_ONLY = "[data-test-draft-visibility-read-only]";
export const DRAFT_VISIBILITY_OPTION = "[data-test-draft-visibility-option]";

// Sidebar actions
export const SIDEBAR_COPY_URL_BUTTON = "[data-test-sidebar-copy-url-button]";
export const SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON = "[data-test-sidebar-publish-for-review-button]";
export const SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY = "[data-test-sidebar-footer-primary-button-read-only]";
export const SIDEBAR_FOOTER_SECONDARY_DROPDOWN_BUTTON = "[data-test-sidebar-footer-secondary-dropdown-button]";
export const SIDEBAR_FOOTER_OVERFLOW_MENU = "[data-test-sidebar-footer-overflow-menu]";

// Buttons
export const APPROVE_BUTTON = "[data-test-approve-button]";
export const DELETE_BUTTON = "[data-test-delete-draft-button]";
export const DOCUMENT_MODAL_PRIMARY_BUTTON = "[data-test-document-modal-primary-button]";

// Modals
export const DELETE_MODAL = "[data-test-delete-draft-modal]";
export const PUBLISH_FOR_REVIEW_MODAL = "[data-test-publish-for-review-modal]";
export const DOC_PUBLISHED_MODAL = "[data-test-doc-published-modal]";
export const TRANSFER_OWNERSHIP_MODAL = "[data-test-transfer-ownership-modal]";
export const OWNERSHIP_TRANSFERRED_MODAL = "[data-test-ownership-transferred-modal]";

// Search
export const SEARCH_INPUT = "[data-test-global-search-input]";
export const SEARCH_POPOVER = ".search-popover";
export const SEARCH_POPOVER_LINK = "[data-test-x-dropdown-list-item-link-to]";
export const KEYBOARD_SHORTCUT = ".global-search-shortcut-affordance";

// User menu
export const USER_MENU_TOGGLE = "[data-test-user-menu-toggle]";

// Search results
export const POPOVER_LOADING_ICON = "[data-test-x-dropdown-list-default-loading-block]";
export const PROJECT_HITS = "[data-test-project-hits]";
export const DOCUMENT_HITS = "[data-test-document-hits]";
export const NO_MATCHES = "[data-test-no-matches]";
export const VIEW_ALL_RESULTS_LINK = "[data-test-view-all-results-link]";
export const PRODUCT_AREA_HIT = "[data-test-product-area-hit]";
export const PROJECT_HIT = "[data-test-project-hit]";
export const DOCUMENT_HIT = "[data-test-document-hit]";
