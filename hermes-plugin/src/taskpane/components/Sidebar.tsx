import * as React from "react";
import {
  makeStyles,
  Text,
  Badge,
  Avatar,
  ProgressBar,
  Dropdown,
  Option,
  Button,
  Tooltip,
  Combobox,
} from "@fluentui/react-components";
import DarkTheme, { commonStyles } from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";
import ThemeToggleButton from "./ThemeToggleButton";
import EditableText from "./EditableText";
import { Person } from "../interfaces/person";
import { Group } from "../interfaces/group";
import WordPluginController from "../utils/wordPluginController";
import timeAgo from "../utils/timeAgo";
import People from "./People";
import PeopleAndGroups from "./PeopleAndGroups";
import ProductIcon from "./ProductIcon";
import ProjectsList from "./ProjectsList";
import RelatedResourcesList from "./RelatedResourcesList";
import { Delete24Regular, Checkmark24Regular, Dismiss24Regular, Open16Filled, PersonDelete20Regular, Edit24Regular, QuestionCircle16Regular, Add16Regular, Copy16Regular, Archive24Regular, ArchiveArrowBack24Regular } from "@fluentui/react-icons";
import { RelatedResource, RelatedExternalLink, RelatedResourcesResponse } from "../interfaces/relatedResources";
import { HermesProject } from "../interfaces/project";

const useStyles = makeStyles({
  root: {
    height: "100vh",
    padding: "16px",
    paddingTop: "44px", // Much reduced space for ultra-thin fixed header
    paddingBottom: "80px", // Space for fixed footer
    boxSizing: "border-box",
    borderRight: `1px solid ${DarkTheme.border.primary}`,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflowY: "auto",
    backgroundColor: DarkTheme.background.primary,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  rowSection: {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
  },
  label: {
    color: DarkTheme.text.tertiary,
    fontSize: "12px",
    fontWeight: 500,
  },
  value: {
    fontSize: "14px",
    color: DarkTheme.text.primary,
  },
  primaryBtn: {
    ...commonStyles.primaryButton,
    width: "100%",
  },
  secondaryBtn: {
    ...commonStyles.secondaryButton,
    width: "100%",
  },
  iconButton: {
    ...commonStyles.primaryIconButton,
    minWidth: "36px !important",
    minHeight: "36px !important",
  },
  secondaryIconButton: {
    ...commonStyles.secondaryIconButton,
    minWidth: "36px !important",
    minHeight: "36px !important",
  },

  floatingHeaderSection: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: "4px 16px 4px 16px", // Match content padding exactly
    backgroundColor: DarkTheme.background.primary,
    borderBottom: `1px solid ${DarkTheme.border.primary}`,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between", // Spread items across full width
    gap: "16px", // Reduced gap between elements
  },

  navHermesLink: {
    color: DarkTheme.components.header.linkColor,
    fontSize: "18px",
    fontWeight: "600",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    "&:hover": {
      color: DarkTheme.components.header.linkHover,
      textDecoration: "none",
    },
    "&:focus": {
      outline: `2px solid ${DarkTheme.border.focus}`,
      outlineOffset: "2px",
    },
  },

  shareButton: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 12px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: DarkTheme.text.secondary,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: DarkTheme.background.tertiary,
    },
    "&:focus": {
      outline: `2px solid ${DarkTheme.border.focus}`,
      outlineOffset: "2px",
    },
  },

  floatingFooterSection: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "16px",
    backgroundColor: DarkTheme.background.primary,
    borderTop: `1px solid ${DarkTheme.border.primary}`,
    zIndex: 10,
  },
  clickableField: {
    padding: "8px",
    borderRadius: "4px",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    ":hover": {
      backgroundColor: DarkTheme.background.tertiary,
      boxShadow: DarkTheme.shadows.small,
    },
  },
  clickableFieldDisabled: {
    padding: "8px",
    borderRadius: "4px",
  },
  statusDropdownApproved: {
    borderRadius: "4px",
    fontWeight: "bold !important",
    textAlign: "center",
    transition: "all 0.2s ease",
    "& .fui-Dropdown__button": {
      fontWeight: "bold !important",
      textAlign: "center",
      justifyContent: "center",
      display: "flex",
      alignItems: "center",
      transition: "all 0.2s ease",
    },
    "& .fui-Dropdown__expandIcon": {
      display: "none",
    },
    ":hover": {
      boxShadow: DarkTheme.shadows.small,
    },
    ":focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
    "& .fui-Dropdown__button:focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
  },
  statusDropdownInReview: {
    borderRadius: "4px",
    fontWeight: "bold !important",
    textAlign: "center",
    transition: "all 0.2s ease",
    "& .fui-Dropdown__button": {
      fontWeight: "bold !important",
      textAlign: "center",
      justifyContent: "center",
      display: "flex",
      alignItems: "center",
      transition: "all 0.2s ease",
    },
    "& .fui-Dropdown__expandIcon": {
      display: "none",
    },
    ":hover": {
      boxShadow: DarkTheme.shadows.small,
    },
    ":focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
    "& .fui-Dropdown__button:focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
  },
  statusDropdownObsolete: {
    borderRadius: "4px",
    fontWeight: "bold !important",
    textAlign: "center",
    transition: "all 0.2s ease",
    "& .fui-Dropdown__button": {
      fontWeight: "bold !important",
      textAlign: "center",
      justifyContent: "center",
      display: "flex",
      alignItems: "center",
      transition: "all 0.2s ease",
    },
    "& .fui-Dropdown__expandIcon": {
      display: "none",
    },
    ":hover": {
      boxShadow: DarkTheme.shadows.small,
    },
    ":focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
    "& .fui-Dropdown__button:focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
  },
  productDropdown: {
    color: `${DarkTheme.text.primary} !important`,
    backgroundColor: `${DarkTheme.background.secondary} !important`,
    border: `1px solid ${DarkTheme.border.primary} !important`,
    borderRadius: "4px",
    transition: "all 0.2s ease",
    "& .fui-Dropdown__button": {
      color: `${DarkTheme.text.primary} !important`,
      backgroundColor: `${DarkTheme.background.secondary} !important`,
      border: `1px solid ${DarkTheme.border.primary} !important`,
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      justifyContent: "flex-start",
      transition: "all 0.2s ease",
    },
    "& .fui-Dropdown__listbox": {
      backgroundColor: `${DarkTheme.background.secondary} !important`,
      border: `1px solid ${DarkTheme.border.primary} !important`,
      borderRadius: "4px",
      boxShadow: DarkTheme.shadows.medium,
    },
    // Global dropdown popup styling
    "& [role='listbox']": {
      backgroundColor: `${DarkTheme.background.secondary} !important`,
      border: `1px solid ${DarkTheme.border.primary} !important`,
      borderRadius: "4px",
      boxShadow: DarkTheme.shadows.medium,
    },
    "& .fui-Option": {
      color: `${DarkTheme.text.primary} !important`,
      backgroundColor: `${DarkTheme.background.secondary} !important`,
      "&:hover": {
        backgroundColor: `${DarkTheme.background.tertiary} !important`,
        color: `${DarkTheme.text.primary} !important`,
      },
      "&[aria-selected='true']": {
        backgroundColor: `${DarkTheme.interactive.primary} !important`,
        color: `${DarkTheme.text.primary} !important`,
      },
    },
    ":hover": {
      border: `1px solid ${DarkTheme.border.secondary} !important`,
      backgroundColor: `${DarkTheme.background.tertiary} !important`,
      "& .fui-Dropdown__button": {
        backgroundColor: `${DarkTheme.background.tertiary} !important`,
        border: `1px solid ${DarkTheme.border.secondary} !important`,
      },
    },
    ":focus": {
      outline: "none !important",
      border: `2px solid ${DarkTheme.border.focus} !important`,
      boxShadow: "none !important",
    },
    "& .fui-Dropdown__button:focus": {
      outline: "none !important",
      boxShadow: "none !important",
    },
  },
  productAreaLink: {
    transition: "all 0.2s ease",
    borderRadius: "4px",
    padding: "4px",
    "&:hover": {
      backgroundColor: DarkTheme.background.tertiary,
      transform: "translateY(-1px)",
    },
  },
  addButton: {
    "& svg": {
      color: `${DarkTheme.text.primary} !important`,
    },
  },
});

type SidebarProps = {
  controller: WordPluginController;
};

const Sidebar = ({ controller }: SidebarProps) => {
  const styles = useStyles();

  // Status CSS class mapping
  const getStatusDropdownClass = (status: string) => {
    switch (status) {
      case "Approved":
        return styles.statusDropdownApproved;
      case "In-Review":
        return styles.statusDropdownInReview;
      case "Obsolete":
        return styles.statusDropdownObsolete;
      default:
        return "";
    }
  };

  // Status color mapping
  const getStatusColors = (status: string, isDraft: boolean = false) => {
    if (isDraft) {
      return {
        textColor: theme.status.draft.text,
        backgroundColor: theme.status.draft.background,
      };
    }
    
    switch (status) {
      case "Approved":
        return {
          textColor: theme.status.approved.text,
          backgroundColor: theme.status.approved.background,
        };
      case "In-Review":
        return {
          textColor: theme.status.inReview.text,
          backgroundColor: theme.status.inReview.background,
        };
      case "Obsolete":
        return {
          textColor: theme.status.obsolete.text,
          backgroundColor: theme.status.obsolete.background,
        };
      default:
        return {
          textColor: theme.text.primary,
          backgroundColor: theme.background.secondary,
        };
    }
  };

  const [loading, setLoading] = React.useState(true);
  const [peopleMap, setPeopleMap] = React.useState(new Map<string, Person>());
  const [groupsMap, setGroupsMap] = React.useState(new Map<string, Group>());
  const [docMeta, setDocMeta] = React.useState(controller.documentMetadata);
  const [switchToProductDropdown, setSwitchToProductDropDown] = React.useState(false);
  const [pendingProductSelection, setPendingProductSelection] = React.useState<string | null>(null);
  const [productError, setProductError] = React.useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [customFieldErrors, setCustomFieldErrors] = React.useState<Record<string, string | null>>({});
  const [disablePublish, setDisablePublish] = React.useState(false);
  const [disableDelete, setDisableDelete] = React.useState(false);
  const [productSearchValue, setProductSearchValue] = React.useState("");
  const [filteredProducts, setFilteredProducts] = React.useState<string[]>([]);
  const [isGroupApprover, setIsGroupApprover] = React.useState(false);
  
  // Transfer ownership states
  const [showTransferOwnership, setShowTransferOwnership] = React.useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = React.useState<Person | null>(null);
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [transferError, setTransferError] = React.useState<string | null>(null);
  
  // Archive states
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);
  const [isArchiveHovered, setIsArchiveHovered] = React.useState(false);
  
  // Leave approver role states
  const [isLeavingApproverRole, setIsLeavingApproverRole] = React.useState(false);
  const [leaveApproverError, setLeaveApproverError] = React.useState<string | null>(null);
  
  // Share success state
  const [shareSuccess, setShareSuccess] = React.useState(false);
  const [shareHovered, setShareHovered] = React.useState(false);
  const [showLeaveApproverConfirmation, setShowLeaveApproverConfirmation] = React.useState(false);
  
  // Acquire ownership states
  const [showAcquireOwnershipConfirmation, setShowAcquireOwnershipConfirmation] = React.useState(false);
  const [isAcquiringOwnership, setIsAcquiringOwnership] = React.useState(false);
  const [acquireOwnershipError, setAcquireOwnershipError] = React.useState<string | null>(null);
  
  // Related Resources states
  const [relatedResources, setRelatedResources] = React.useState<RelatedResourcesResponse>({
    externalLinks: [],
    hermesDocuments: []
  });
  const [relatedResourcesLoading, setRelatedResourcesLoading] = React.useState(false);
  const [relatedResourcesError, setRelatedResourcesError] = React.useState<string | null>(null);
  
  // Projects states
  const [projects, setProjects] = React.useState<HermesProject[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(false);
  const [projectsError, setProjectsError] = React.useState<string | null>(null);
  const [showAddProjectForm, setShowAddProjectForm] = React.useState(false);
  
  // Check if current user is the owner to control edit permissions
  const isCurrentUserOwner = controller.isCurrentUserIsOwner();

  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;

  // Add global styles for dropdown portal (Fluent UI dropdowns render in portals)
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Target all possible dropdown containers */
      .fui-Portal .fui-Dropdown__listbox,
      [role="listbox"],
      .fui-Listbox {
        background-color: ${theme.background.secondary} !important;
        border: 1px solid ${theme.border.primary} !important;
        border-radius: 4px !important;
        box-shadow: ${theme.shadows.medium} !important;
      }
      
      /* Target all possible option elements */
      .fui-Portal .fui-Option,
      [role="option"],
      .fui-Option {
        color: ${theme.text.primary} !important;
        background-color: ${theme.background.secondary} !important;
      }
      
      /* Hover states */
      .fui-Portal .fui-Option:hover,
      [role="option"]:hover,
      .fui-Option:hover {
        background-color: ${theme.background.tertiary} !important;
        color: ${theme.text.primary} !important;
      }
      
      /* Selected states */
      .fui-Portal .fui-Option[aria-selected="true"],
      [role="option"][aria-selected="true"],
      .fui-Option[aria-selected="true"] {
        background-color: ${theme.interactive.primary} !important;
        color: ${theme.text.inverse} !important;
      }

      /* Additional specificity for stubborn elements */
      div[role="listbox"] > div[role="option"] {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
      }

      div[role="listbox"] > div[role="option"]:hover {
        background-color: ${theme.background.tertiary} !important;
        color: ${theme.text.primary} !important;
      }

      /* Target product dropdown specifically with maximum specificity */
      #product-area-dropdown + [role="listbox"],
      #product-area-dropdown ~ [role="listbox"] {
        background-color: ${theme.background.secondary} !important;
        border: 1px solid ${theme.border.primary} !important;
      }

      #product-area-dropdown + [role="listbox"] [role="option"],
      #product-area-dropdown ~ [role="listbox"] [role="option"] {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
      }

      /* ComboBox input field styling */
      .fui-Combobox input,
      #product-area-dropdown input,
      [class*="Combobox"] input {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
        border: 1px solid ${theme.border.primary} !important;
      }

      /* ComboBox input placeholder styling */
      .fui-Combobox input::placeholder,
      #product-area-dropdown input::placeholder,
      [class*="Combobox"] input::placeholder {
        color: ${theme.text.secondary} !important;
      }

      /* ComboBox container styling */
      .fui-Combobox,
      #product-area-dropdown,
      [class*="Combobox"] {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
      }

      /* Nuclear option - target everything with highest specificity */
      * {
        --fui-colorNeutralBackground1: ${theme.background.secondary} !important;
        --fui-colorNeutralForeground1: ${theme.text.primary} !important;
      }
      
      [data-testid*="dropdown"] [role="option"],
      [class*="dropdown"] [role="option"],
      [class*="Dropdown"] [role="option"] {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
      }

      /* Fix ComboBox dropdown positioning issues */
      .fui-Combobox__listbox,
      #product-area-dropdown + [role="listbox"],
      [class*="Combobox"] [role="listbox"] {
        max-height: 200px !important;
        overflow-y: auto !important;
        z-index: 9999 !important;
      }

      /* Prevent ResizeObserver issues by constraining the dropdown */
      .fui-Portal {
        contain: layout style !important;
      }

      /* Ensure dropdown doesn't cause layout shifts */
      .fui-Combobox {
        position: relative !important;
      }

      /* Limit dropdown width and height */
      #product-area-dropdown + [role="listbox"] {
        max-width: 300px !important;
        max-height: 200px !important;
        overflow: auto !important;
      }

      /* TagPicker dropdown - show all results with scrolling */
      
      /* Reasonable height limit with scrolling for many results */
      .fui-TagPickerList,
      [class*="fui-TagPickerList"],
      div[data-people-dropdown] [role="listbox"] {
        max-height: 200px !important;
        overflow-y: auto !important;
        z-index: 10000 !important;
        background-color: ${theme.background.elevated} !important;
        border: 1px solid ${theme.border.primary} !important;
        box-shadow: ${theme.shadows.medium} !important;
      }

      /* Only fix colors - let Fluent UI handle layout naturally */
      .fui-TagPickerList [role="option"],
      div[data-people-dropdown] [role="option"] {
        background-color: ${theme.background.elevated} !important;
        color: ${theme.text.primary} !important;
      }

      .fui-TagPickerList [role="option"]:hover,
      div[data-people-dropdown] [role="option"]:hover {
        background-color: ${theme.background.tertiary} !important;
      }

      /* Input theming only */
      .fui-TagPickerInput input {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
      }

      /* Control theming only */
      .fui-TagPickerControl {
        background-color: ${theme.background.secondary} !important;
        border: 1px solid ${theme.border.primary} !important;
      }

      /* ── Override makeStyles baked-in dark theme colors ── */

      /* Status dropdown - override baked DarkTheme colors for .fui-Dropdown__button */
      .fui-Dropdown .fui-Dropdown__button {
        color: inherit !important;
        background-color: inherit !important;
      }

      /* Product dropdown override */
      .fui-Combobox,
      .fui-Combobox input {
        background-color: ${theme.background.secondary} !important;
        color: ${theme.text.primary} !important;
        border-color: ${theme.border.primary} !important;
      }

      /* Section labels */
      .fui-Text {
        color: ${theme.text.primary};
      }

      /* Project items */
      [class*="projectItem"] {
        background-color: ${theme.background.secondary} !important;
        border-color: ${theme.border.primary} !important;
        color: ${theme.text.primary} !important;
      }
      [class*="projectItem"]:hover {
        background-color: ${theme.background.tertiary} !important;
      }
      [class*="projectTitle"] {
        color: ${theme.text.primary} !important;
      }
      [class*="projectDescription"] {
        color: ${theme.text.secondary} !important;
      }

      /* Add project section */
      [class*="addProjectSection"] {
        background-color: ${theme.background.secondary} !important;
        border-color: ${theme.border.primary} !important;
      }
      [class*="searchResultItem"] {
        background-color: ${theme.background.secondary} !important;
        border-color: ${theme.border.primary} !important;
      }
      [class*="searchResultItem"]:hover {
        background-color: ${theme.background.tertiary} !important;
      }

      /* Edit resource form container */
      [class*="container"] > .fui-Text {
        color: ${theme.text.primary} !important;
      }

      /* Empty states */
      [class*="emptyState"] {
        color: ${theme.text.tertiary} !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [isDark]);

  // Helper function to handle errors consistently across all fields
  const handleMetadataUpdateError = (err: any, fieldName: string): string => {
    console.error(`${fieldName} - Failed to save changes:`, err);
    
    // Extract HTTP status code from error
    let statusCode = "";
    
    if (err.response) {
      // Axios-style HTTP error response
      statusCode = `${err.response.status}`;
      console.log(`${fieldName} - Found axios-style error with status:`, statusCode);
    } else if (err.message) {
      // Parse HermesClient error format for status code
      const statusMatch = err.message.match(/status:\s*(\d+)/);
      if (statusMatch) {
        statusCode = statusMatch[1];
        console.log(`${fieldName} - Found HermesClient error with status:`, statusCode);
      }
    }
    
    let fullError = "Server Error";
    if (statusCode === "403") {
      fullError = "Permission Denied, Only Owners can update the metadata.";
    } else if (statusCode) {
      fullError = `Server Responded : ${statusCode}`;
    }
    
    console.log(`${fieldName} - Setting error:`, fullError);
    return fullError;
  };

  async function getPeople() {
    const peopleSet = new Set<string>([
      ...docMeta.owners,
      ...(docMeta.approvers || []),
      ...(docMeta.contributors || []),
    ]);

    // Add emails from custom people fields
    Object.keys(docMeta.customEditableFields || {}).forEach((customKey) => {
      const customField = docMeta.customEditableFields[customKey];
      if (customField.type === "PEOPLE") {
        const customPeopleEmails = docMeta[customKey] || [];
        customPeopleEmails.forEach((email: string) => peopleSet.add(email));
      }
    });

    const emails = Array.from(peopleSet);
    setPeopleMap(await controller.getEmailToPersonMap(emails));
  }

  async function getGroups() {
    const approverGroups = docMeta.approverGroups || [];
    if (!approverGroups.length) {
      setGroupsMap(new Map<string, Group>());
      return;
    }

  const map = await controller.getEmailToGroupMap(approverGroups);
  setGroupsMap(new Map(map));
  }

  async function checkGroupApprover() {
    try {
      const canApprove = await controller.isCurrentGroupApprover();
      setIsGroupApprover(canApprove);
    } catch (error) {
      setIsGroupApprover(false);
    }
  }

  const renderCustomFields = () => {
    if (!docMeta.customEditableFields) return null;
    
    return Object.keys(docMeta.customEditableFields).map((customKey, index) => {
      const customField = docMeta.customEditableFields[customKey];
      const key = customField.displayName;
      const value = docMeta[customKey];

      return (
        <div className={styles.section} key={index}>
          {customField.type === "PEOPLE" ? (
            <People
              label={key}
              peopleMap={peopleMap}
              emails={value || []}
              update={async (emails) => {
                customField.values = emails;
                await controller.updateMetadata(
                  {
                    customFields: [
                      {
                        name: customKey,
                        displayName: key,
                        type: customField.type,
                        value: emails,
                      },
                    ],
                  },
                  setDocMeta
                );
              }}
              createUrl={(p) => controller.createHermesUrlFromPerson(p)}
              search={search}
              mutatePeopleMap={(map) => setPeopleMap(new Map(map))}
              isMe={(email) => controller.isMe(email)}
              addGreenTick={() => false} // Custom people fields never get green ticks
              disable={!isCurrentUserOwner}
            />
          ) : (
            <>
              <EditableText
                label={key}
                text={value || "N/A"}
                size={200}
                disabled={!isCurrentUserOwner}
                onChange={async (text: string) => {
                  if (!isCurrentUserOwner) return; // Prevent action if not owner
                  setCustomFieldErrors(prev => ({ ...prev, [customKey]: null })); // Clear previous errors
                  try {
                    await controller.updateMetadata(
                      {
                        customFields: [
                          {
                            name: customKey,
                            displayName: key,
                            type: customField.type,
                            value: text,
                          },
                        ],
                      },
                      setDocMeta
                    );
                  } catch (err: any) {
                    const errorMessage = handleMetadataUpdateError(err, `Custom Field: ${key}`);
                    setCustomFieldErrors(prev => ({ ...prev, [customKey]: errorMessage }));
                  }
                }}
              />
              
              {/* Error display for Custom field */}
              {customFieldErrors[customKey] && (
                <Text 
                  size={200} 
                  style={{ 
                    color: theme.interactive.danger, 
                    marginTop: "8px",
                    fontSize: "12px",
                    display: "block"
                  }}
                >
                  Error: {customFieldErrors[customKey]}
                </Text>
              )}
            </>
          )}
        </div>
      );
    });
  };

  const updateProductSelection = async (selectedProduct: string) => {
    if (!selectedProduct) return;
    
    setIsSavingProduct(true);
    setProductError(null); // Clear previous errors
    try {
      await controller.updateMetadata(
        {
          product: selectedProduct,
        },
        setDocMeta
      );
      setPendingProductSelection(null);
      setSwitchToProductDropDown(false);
      setProductSearchValue(""); // Clear search
    } catch (err: any) {
      const errorMessage = handleMetadataUpdateError(err, "Product/Area");
      setProductError(errorMessage);
      
      // Keep the dropdown open to show error
      console.log("Product/Area field should stay open to show error");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const renderProductDropdown = () => {
    return (
      <Combobox
        appearance="outline"
        className={styles.productDropdown}
        id="product-area-dropdown"
        value={productSearchValue}
        selectedOptions={[pendingProductSelection || docMeta.product]}
        onOptionSelect={(_, data) => {
          // Don't select the "No results" option
          if (data.optionValue && data.optionValue !== "") {
            // Directly update the product selection
            updateProductSelection(data.optionValue);
          }
        }}
        onInput={(e) => {
          setProductSearchValue((e.target as HTMLInputElement).value);
        }}
        placeholder={isSavingProduct ? "Saving..." : "Search for a product or area..."}
        disabled={isSavingProduct}
        style={{
          backgroundColor: theme.background.secondary,
          color: theme.text.primary,
          border: `1px solid ${theme.border.primary}`,
          opacity: isSavingProduct ? 0.7 : 1,
        }}
      >
        {filteredProducts.length > 0 ? (
          filteredProducts.map((key, index) => {
            const productData = controller.products[key];
            return (
              <Option 
                value={key} 
                key={index} 
                className={styles.rowSection} 
                text={key}
                style={{ color: theme.text.primary }}
              >
                <ProductIcon 
                  product={key} 
                  productData={productData}
                  size="medium"
                />
                <Text className={styles.value} style={{ color: theme.text.primary }}>{key}</Text>
              </Option>
            );
          })
        ) : (
          productSearchValue.trim() ? (
            <Option 
              value="" 
              key="no-results" 
              disabled
              text="No matching products found"
              style={{ color: theme.text.secondary, fontStyle: "italic" }}
            >
              <Text style={{ color: theme.text.secondary, fontStyle: "italic" }}>
                No matching products found
              </Text>
            </Option>
          ) : null
        )}
      </Combobox>
    );
  };

  const search = async (query: string) => {
    return await controller.searchPeople(query);
  };

  const searchGroups = async (query: string) => {
    return await controller.searchGroups(query);
  };

  // Related Resources methods
  const loadRelatedResources = async () => {
    setRelatedResourcesLoading(true);
    setRelatedResourcesError(null);
    
    try {
      const resources = await controller.loadRelatedResources();
      setRelatedResources(resources);
    } catch (error) {
      console.error("Failed to load related resources:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load related resources";
      setRelatedResourcesError(errorMessage);
      // Set empty resources to prevent crashes
      setRelatedResources({ externalLinks: [], hermesDocuments: [] });
    } finally {
      setRelatedResourcesLoading(false);
    }
  };

  const handleAddRelatedResource = async (resource: RelatedResource) => {
    try {
      await controller.addRelatedResource(resource);
      setRelatedResources(controller.getCachedRelatedResources());
    } catch (error) {
      console.error("Failed to add related resource:", error);
      throw error; // Re-throw to let the component handle the error display
    }
  };

  const handleEditRelatedResource = async (resource: RelatedExternalLink) => {
    try {
      await controller.updateRelatedResource(resource);
      setRelatedResources(controller.getCachedRelatedResources());
    } catch (error) {
      console.error("Failed to edit related resource:", error);
      throw error; // Re-throw to let the component handle the error display
    }
  };

  const handleRemoveRelatedResource = async (resource: RelatedResource) => {
    try {
      await controller.removeRelatedResource(resource);
      setRelatedResources(controller.getCachedRelatedResources());
    } catch (error) {
      console.error("Failed to remove related resource:", error);
      throw error; // Re-throw to let the component handle the error display
    }
  };

  // Projects methods
  const loadProjects = async () => {
    setProjectsLoading(true);
    setProjectsError(null);
    
    try {
      const projectsList = await controller.loadDocumentProjects();
      setProjects(projectsList);
    } catch (error) {
      console.error("Failed to load projects:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load projects";
      setProjectsError(errorMessage);
      setProjects([]); // Set empty array to prevent crashes
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleAddProject = async (project: HermesProject) => {
    try {
      await controller.addDocumentToProject(project.id);
      // Reload projects to get the updated list
      await loadProjects();
    } catch (error) {
      console.error("Failed to add project:", error);
      throw error; // Re-throw to let the component handle the error display
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    try {
      await controller.removeDocumentFromProject(projectId);
      // Reload projects to get the updated list  
      await loadProjects();
    } catch (error) {
      console.error("Failed to remove project:", error);
      throw error; // Re-throw to let the component handle the error display
    }
  };

  React.useEffect(() => {
    const fn = async () => {
      try {
        // Update docMeta from controller in case it changed
        setDocMeta(controller.documentMetadata);
        await getPeople();
        await getGroups();
        await checkGroupApprover();
        await controller.renderTable();
        
        // Load related resources
        await loadRelatedResources();
        
        // Load projects
        await loadProjects();
      } catch (error) {
        console.log("error", error);
      } finally {
        setLoading(false);
      }
    };

    (async () => {
      await fn();
    })();
  }, []);

  // Effect to sync docMeta with controller when it changes
  React.useEffect(() => {
    setDocMeta(controller.documentMetadata);
  }, [controller.documentMetadata]);

  // Separate effect to update people when docMeta changes
  React.useEffect(() => {
    if (loading) {
      return;
    }

    (async () => {
      try {
        await getPeople();
        await getGroups();
        await checkGroupApprover();
      } catch (error) {
      }
    })();
  }, [
    docMeta.owners,
    docMeta.approvers,
    docMeta.approverGroups,
    docMeta.contributors,
    // Watch for changes in custom people fields
    ...Object.keys(docMeta.customEditableFields || {})
      .filter(key => docMeta.customEditableFields[key].type === "PEOPLE")
      .map(key => docMeta[key])
  ]);

  // Initialize filtered products on first load
  React.useEffect(() => {
    const productNames = Object.keys(controller.products);
    setFilteredProducts(productNames);
  }, []);

  // Update filtered products when search value or products change
  React.useEffect(() => {
    const productNames = Object.keys(controller.products);
    if (!productSearchValue.trim()) {
      setFilteredProducts(productNames);
    } else {
      const filtered = productNames.filter(productName =>
        productName.toLowerCase().includes(productSearchValue.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchValue, controller.products]);

  if (loading) {
    return (
      <div className={styles.root} style={{ backgroundColor: theme.background.primary, color: theme.text.primary }}>
        <ProgressBar />
      </div>
    );
  }

  return (
    <>
      {/* Fixed Header Navigation */}
      <div className={styles.floatingHeaderSection} style={{ backgroundColor: theme.background.primary, borderBottomColor: theme.border.primary }}>
        {/* Hermes Link - Aligned with content below */}
        <a 
          href={controller.getHermesBaseUrl()} 
          target="_blank" 
          rel="noopener noreferrer"
          className={styles.navHermesLink}
        >
          Hermes <Open16Filled />
        </a>

        {/* Share Button - Only show for published documents */}
        {!docMeta._isDraft && (
          <div style={{ marginRight: "8px" }}>
            <Tooltip
              content="Copy the Document Link"
              relationship="description"
            >
              <div
                className={styles.shareButton}
              style={shareSuccess ? {
                backgroundColor: theme.status.approved.background,
                border: `1px solid ${theme.status.approved.border}`,
                color: theme.status.approved.text
              } : shareHovered ? {
                backgroundColor: theme.background.tertiary,
                color: theme.text.primary,
              } : {}}
              onMouseEnter={() => setShareHovered(true)}
              onMouseLeave={() => setShareHovered(false)}
              onClick={() => {
                const shortLink = `${controller.getHermesBaseUrl()}/l/${docMeta.docType.toLowerCase()}/${docMeta.docNumber.toLowerCase()}`;
                
                // Try multiple methods to copy to clipboard
                const copyToClipboard = async (text: string) => {
                  try {
                    // Method 1: Try modern clipboard API first
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(text);
                      console.log("Short link copied to clipboard (modern API):", text);
                      return true;
                    }
                  } catch (err) {
                    console.warn("Modern clipboard API failed:", err);
                  }
                  
                  try {
                    // Method 2: Fallback to execCommand (deprecated but more compatible)
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (successful) {
                      console.log("Short link copied to clipboard (execCommand):", text);
                      return true;
                    }
                  } catch (err) {
                    console.warn("execCommand clipboard method failed:", err);
                  }
                  
                  // Method 3: Last resort - show alert with link to copy manually
                  alert(`Copy this link manually:\n\n${text}`);
                  console.log("Clipboard copy failed, showed manual copy alert:", text);
                  return false;
                };
                
                copyToClipboard(shortLink).then((success) => {
                  if (success !== false) {
                    setShareSuccess(true);
                    // Reset success state after 2 seconds
                    setTimeout(() => setShareSuccess(false), 2000);
                  }
                });
              }}
            >
              {shareSuccess ? (
                <>
                  <Checkmark24Regular style={{ width: "16px", height: "16px" }} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy16Regular style={{ width: "16px", height: "16px" }} />
                  Share
                </>
              )}
              </div>
            </Tooltip>
          </div>
        )}
        {/* Theme Toggle Button - always visible */}
        <ThemeToggleButton />
      </div>

      {/* Scrollable Content */}
      <div className={styles.root} style={{ backgroundColor: theme.background.primary, color: theme.text.primary }}>
        {/* Status */}
      {docMeta._isDraft ? (
        <div 
          style={{
            ...getStatusColors(docMeta.status, true),
            color: docMeta.archived ? theme.status.obsolete.text : getStatusColors(docMeta.status, true).textColor,
            backgroundColor: docMeta.archived ? theme.status.obsolete.background : getStatusColors(docMeta.status, true).backgroundColor,
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "bold",
            display: "block",
            textAlign: "center",
            margin: "0 8px"
          }}
        >
          {docMeta.archived ? "Archived" : docMeta.status}
        </div>
      ) : (
        <Dropdown
          className={getStatusDropdownClass(docMeta.status)}
          disabled={!isCurrentUserOwner}
          onOptionSelect={async (_, data) => {
            if (!isCurrentUserOwner) return; // Prevent action if not owner
            setStatusError(null); // Clear previous errors
            try {
              await controller.updateMetadata(
                {
                  status: data.optionValue,
                  },
                  setDocMeta
              );
            } catch (err: any) {
              const errorMessage = handleMetadataUpdateError(err, "Status");
              setStatusError(errorMessage);
            }
          }}
          value={docMeta.status}
          style={{
            color: getStatusColors(docMeta.status).textColor,
            backgroundColor: getStatusColors(docMeta.status).backgroundColor,
            border: `1px solid ${
              docMeta.status === "Approved" ? theme.status.approved.border :
              docMeta.status === "In-Review" ? theme.status.inReview.border :
              theme.status.obsolete.border
            }`,
          }}
        >
          <Option 
            value={"In-Review"} 
            text={"In-Review"}
            style={{
              color: getStatusColors("In-Review").textColor,
              backgroundColor: getStatusColors("In-Review").backgroundColor
            }}
          >
            {"In-Review"}
          </Option>
          <Option 
            value={"Approved"} 
            text={"Approved"}
            style={{
              color: getStatusColors("Approved").textColor,
              backgroundColor: getStatusColors("Approved").backgroundColor
            }}
          >
            {"Approved"}
          </Option>
          <Option 
            value={"Obsolete"} 
            text={"Obsolete"}
            style={{
              color: getStatusColors("Obsolete").textColor,
              backgroundColor: getStatusColors("Obsolete").backgroundColor
            }}
          >
            {"Obsolete"}
          </Option>
          </Dropdown>
      )}
      
      {/* Error display for Status field */}
      {statusError && (
        <Text 
          size={200} 
          style={{ 
            color: theme.interactive.danger, 
            marginTop: "8px",
            fontSize: "12px",
            display: "block"
          }}
        >
          Error: {statusError}
        </Text>
      )}

      {/* Title */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ margin: 0, padding: 0 }}>
          <EditableText
            text={docMeta.title || ""}
            size={500}
            weight={"bold"}
            disabled={!isCurrentUserOwner}
            onChange={async (text: string) => {
              if (!isCurrentUserOwner) return; // Prevent action if not owner
              setTitleError(null); // Clear previous errors
              try {
                await controller.updateMetadata(
                  {
                    title: text,
                  },
                  setDocMeta
                );
              } catch (err: any) {
                const errorMessage = handleMetadataUpdateError(err, "Title");
                setTitleError(errorMessage);
              }
            }}
          />
          
          {/* Error display for Title field */}
          {titleError && (
            <Text 
              size={200} 
              style={{ 
                color: theme.interactive.danger, 
                marginTop: "4px",
                fontSize: "12px",
                display: "block"
              }}
            >
              Error: {titleError}
            </Text>
          )}
        </div>
        <div style={{ margin: 0, padding: 0, marginLeft: "8px" }}>
          <Text size={500}>{docMeta.docNumber}</Text>
        </div>
      </div>

      {/* Tag */}
      <div style={{ margin: 0, padding: 0, marginLeft: "8px" }}>
        <div 
          style={{
            backgroundColor: theme.background.subtle,
            color: theme.text.primary,
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "16px",
            fontWeight: "bold",
            display: "inline-block",
            textAlign: "left",
            margin: 0
          }}
        >
          {docMeta.docType}
        </div>
      </div>      {/* Summary */}
      <div className={styles.section}>
        <EditableText
          label="Summary"
          size={200}
          text={docMeta.summary || ""}
          multiline={true}
          disabled={!isCurrentUserOwner}
          onChange={async (text: string) => {
            if (!isCurrentUserOwner) return; // Prevent action if not owner
            setSummaryError(null); // Clear previous errors
            try {
              await controller.updateMetadata(
                {
                  summary: text,
                },
                setDocMeta
              );
            } catch (err: any) {
              const errorMessage = handleMetadataUpdateError(err, "Summary");
              setSummaryError(errorMessage);
            }
          }}
        />
        
        {/* Error display for Summary field */}
        {summaryError && (
          <Text 
            size={200} 
            style={{ 
              color: theme.interactive.danger, 
              marginTop: "8px",
              fontSize: "12px",
              display: "block"
            }}
          >
            Error: {summaryError}
          </Text>
        )}
      </div>

      {/* Product/Area */}
      <div className={styles.section}>
        <Text className={styles.label}>Product/Area</Text>
        {switchToProductDropdown && controller.documentMetadata._isDraft && isCurrentUserOwner ? (
          <div className={styles.rowSection}>
            {renderProductDropdown()}
            <Button 
              appearance="secondary" 
              size="medium"
              icon={<Dismiss24Regular />}
              onClick={() => {
                setPendingProductSelection(null);
                setProductError(null); // Clear any error messages
                setSwitchToProductDropDown(false);
                setProductSearchValue(""); // Clear search
              }}
              disabled={isSavingProduct}
              title="Cancel"
            />
          </div>
        ) : (
          <div className={styles.rowSection}>
            <div 
              className={styles.productAreaLink}
              onClick={() => {
                const productAreaUrl = controller.getProductAreaUrl(docMeta.product);
                window.open(productAreaUrl, '_blank');
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = theme.background.tertiary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
              }}
              style={{ 
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flex: 1
              }}
            >
              <ProductIcon 
                product={docMeta.product} 
                productData={controller.products[docMeta.product]}
                size="medium"
              />
              <Text className={styles.value}>{docMeta.product}</Text>
            </div>
            {(controller.documentMetadata._isDraft && isCurrentUserOwner) && (
              <Button
                appearance="subtle"
                size="small"
                icon={<Edit24Regular />}
                onClick={() => setSwitchToProductDropDown(true)}
                style={{ marginLeft: "8px", color: theme.text.primary }}
                title="Edit Product/Area"
              />
            )}
          </div>
        )}
        
        {/* Error display for Product/Area field */}
        {productError && (
          <Text 
            size={200} 
            style={{ 
              color: theme.interactive.danger, 
              marginTop: "8px",
              fontSize: "12px",
              display: "block"
            }}
          >
            Error: {productError}
          </Text>
        )}
      </div>

      {/* Created */}
      <div className={styles.section}>
        <Text className={styles.label}>Created</Text>
        <Text className={styles.value}>{docMeta.created}</Text>
      </div>

      {/* Last modified */}
      <div className={styles.section}>
        <Text className={styles.label}>Last modified</Text>
        <Text className={styles.value}>{timeAgo(docMeta.modifiedTime * 1000)}</Text>
      </div>

      {/* Owner */}
      <div className={styles.section}>
        <Text className={styles.label}>Owner</Text>
        <div className={styles.rowSection}>
          <Avatar
            name={peopleMap.get(docMeta.owners[0])?.names?.[0].displayName || docMeta.owners[0]}
            color="red"
            size={24}
            image={{
              src: controller.createHermesUrlFromPerson(peopleMap.get(docMeta.owners[0])),
            }}
          />
          <div 
            className={styles.productAreaLink}
            onClick={() => {
              const documentsUrl = controller.getDocumentsByOwnerUrl(docMeta.owners[0]);
              window.open(documentsUrl, '_blank');
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = theme.background.tertiary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
            }}
            style={{ 
              cursor: "pointer",
              flex: 1
            }}
          >
            <Text className={styles.value}>
              {controller.isMe(docMeta.owners[0])
                ? "Me"
                : peopleMap.get(docMeta.owners[0])?.names?.[0].displayName || docMeta.owners[0]}
            </Text>
          </div>
        </div>
      </div>

      {/* Contributors */}
      <People
        label="Contributors"
        peopleMap={peopleMap}
        emails={docMeta.contributors || []}
        update={async (contributors: string[]) => {
          await controller.updateMetadata({ contributors }, setDocMeta);
        }}
        search={search}
        createUrl={(person) => controller.createHermesUrlFromPerson(person)}
  mutatePeopleMap={(map) => setPeopleMap(new Map(map))}
        isMe={(email) => controller.isMe(email)}
        addGreenTick={() => false} // Contributors never get green ticks
        disable={!isCurrentUserOwner}
      />

      {/* Approvers */}
      <PeopleAndGroups
        label="Approvers"
        peopleMap={peopleMap}
        groupsMap={groupsMap}
        emails={[...(docMeta.approverGroups || []), ...(docMeta.approvers || [])]}
        update={async (emails: string[]) => {
          const groupEmails = emails.filter((email) => groupsMap.has(email));
          const personEmails = emails.filter((email) => !groupsMap.has(email));

          await controller.updateMetadata(
            {
              approvers: personEmails,
              approverGroups: groupEmails,
            },
            setDocMeta
          );
        }}
        searchPeople={search}
        searchGroups={searchGroups}
        createUrl={(p) => controller.createHermesUrlFromPerson(p)}
  mutatePeopleMap={(map) => setPeopleMap(new Map(map))}
  mutateGroupsMap={(map) => setGroupsMap(new Map(map))}
        isMe={(email) => controller.isMe(email)}
        addGreenTick={(email) => controller.documentMetadata.approvedBy?.includes(email) || false}
        disable={!isCurrentUserOwner || controller.isApprovedByCurrentUser()}
      />

      {/* Projects */}
      <div className={styles.section}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Text className={styles.label}>Projects</Text>
          {controller.documentMetadata?._isDraft ? (
            <Tooltip
              content="Only published documents can be added to projects. Publish this document to manage projects."
              relationship="description"
            >
              <QuestionCircle16Regular style={{ color: theme.text.tertiary }} />
            </Tooltip>
          ) : (
            isCurrentUserOwner && (
              <Tooltip
                content="Add to project"
                relationship="description"
              >
                <Button
                  appearance="subtle"
                  size="small"
                  icon={<Add16Regular />}
                  className={styles.addButton}
                  style={{ minWidth: "auto", padding: "2px", height: "20px" }}
                  onClick={() => setShowAddProjectForm(true)}
                />
              </Tooltip>
            )
          )}
        </div>
        <ProjectsList
          projects={projects}
          isLoading={projectsLoading}
          error={projectsError}
          isOwner={isCurrentUserOwner}
          isDraft={controller.documentMetadata?._isDraft || false}
          showAddForm={showAddProjectForm}
          controller={controller}
          onAdd={async (project) => {
            await handleAddProject(project);
            setShowAddProjectForm(false);
          }}
          onRemove={handleRemoveProject}
          onRetry={loadProjects}
        />
      </div>

      {/* Leave Approver Role - Only show to current approvers who haven't approved yet */}
      {(() => {
        const isApprover = controller.isCurrentApprover();
        const hasApproved = controller.isApprovedByCurrentUser();
        return isApprover && !hasApproved;
      })() && (
        <div style={{ marginTop: "8px", marginBottom: "8px" }}>
          {leaveApproverError && (
            <Text 
              size={200} 
              style={{ 
                color: theme.interactive.danger, 
                fontSize: "12px",
                marginBottom: "8px"
              }}
            >
              Error: {leaveApproverError}
            </Text>
          )}
          
          {!showLeaveApproverConfirmation ? (
            <Text 
              className={styles.label}
              onClick={() => {
                console.log("Leave Approver Role clicked - showing confirmation");
                setShowLeaveApproverConfirmation(true);
                setLeaveApproverError(null);
              }}
              style={{
                cursor: "pointer",
                color: theme.text.disabled,
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              Leave Approver Role
            </Text>
          ) : (
            <div style={{ 
              padding: "8px 12px", 
              backgroundColor: theme.background.subtle, 
              border: `1px solid ${theme.border.subtle}`, 
              borderRadius: "4px",
              marginBottom: "8px"
            }}>
              <Text 
                className={styles.label} 
                style={{ 
                  fontSize: "12px", 
                  marginBottom: "8px", 
                  display: "block",
                  color: theme.text.disabled
                }}
              >
                Are you sure you want to leave the approver role?
              </Text>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  className={styles.iconButton}
                  appearance="primary"
                  size="small"
                  disabled={isLeavingApproverRole}
                  onClick={async () => {
                    console.log("Confirmed - proceeding with leave approver role...");
                    
                    setIsLeavingApproverRole(true);
                    setLeaveApproverError(null);
                    
                    try {
                      // Filter out current user's email from approvers
                      const currentApprovers = docMeta.approvers || [];
                      console.log("Current approvers:", currentApprovers);
                      
                      const updatedApprovers = currentApprovers.filter(
                        (email) => !controller.isMe(email)
                      );
                      
                      console.log("Updated approvers after filtering:", updatedApprovers);
                      
                      // Update via API
                      console.log("Calling updateMetadata with:", { approvers: updatedApprovers });
                      await controller.updateMetadata(
                        { approvers: updatedApprovers }, 
                        setDocMeta
                      );
                      
                      // Success - the UI will automatically update since the user is no longer an approver
                      console.log("Successfully left approver role");
                      setShowLeaveApproverConfirmation(false);
                      
                    } catch (err: any) {
                      const errorMessage = handleMetadataUpdateError(err, "Leave Approver Role");
                      setLeaveApproverError(errorMessage);
                    } finally {
                      setIsLeavingApproverRole(false);
                    }
                  }}
                  style={{
                    backgroundColor: theme.text.disabled,
                    borderColor: theme.text.disabled,
                    color: theme.text.inverse
                  }}
                >
                  {isLeavingApproverRole ? "Leaving..." : "Confirm"}
                </Button>
                
                <Button
                  className={styles.secondaryIconButton}
                  appearance="secondary"
                  size="small"
                  disabled={isLeavingApproverRole}
                  onClick={() => {
                    console.log("Cancelled leave approver role");
                    setShowLeaveApproverConfirmation(false);
                    setLeaveApproverError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acquire Ownership - Only show for contributors who are not owners and for published documents */}
      {!docMeta._isDraft &&
        controller.isCurrentUserContributor() &&
        !controller.isCurrentUserIsOwner() && (
        <div style={{ marginTop: "8px", marginBottom: "8px" }}>
          {acquireOwnershipError && (
            <Text 
              size={200} 
              style={{ 
                color: theme.interactive.danger, 
                fontSize: "12px",
                marginBottom: "8px"
              }}
            >
              Error: {acquireOwnershipError}
            </Text>
          )}
          
          {!showAcquireOwnershipConfirmation ? (
            <Text 
              className={styles.label}
              onClick={() => {
                setShowAcquireOwnershipConfirmation(true);
                setAcquireOwnershipError(null);
              }}
              style={{
                cursor: "pointer",
                color: theme.text.disabled,
                fontSize: "12px",
                fontWeight: "500"
              }}
            >
              Acquire Ownership
            </Text>
          ) : (
            <div style={{ 
              padding: "8px 12px", 
              backgroundColor: theme.background.subtle, 
              border: `1px solid ${theme.border.subtle}`, 
              borderRadius: "4px",
              marginBottom: "8px"
            }}>
              <Text 
                size={200} 
                style={{ 
                  color: theme.text.secondary, 
                  fontSize: "12px",
                  marginBottom: "12px",
                  display: "block"
                }}
              >
                If the current owner is not in the company directory, you will be granted ownership.
              </Text>
              
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  className={styles.iconButton}
                  appearance="primary"
                  size="small"
                  disabled={isAcquiringOwnership}
                  onClick={async () => {
                    setIsAcquiringOwnership(true);
                    setAcquireOwnershipError(null);
                    try {
                      await controller.updateMetadata({ 
                        owners: [controller.getCurrentUserEmail()] 
                      }, setDocMeta);
                      setShowAcquireOwnershipConfirmation(false);
                    } catch (error: any) {
                      console.error("Error acquiring ownership:", error);
                      setAcquireOwnershipError(error?.message || "Failed to acquire ownership");
                    } finally {
                      setIsAcquiringOwnership(false);
                    }
                  }}
                >
                  {isAcquiringOwnership ? "Processing..." : "Confirm"}
                </Button>
                
                <Button
                  className={styles.secondaryIconButton}
                  appearance="secondary"
                  size="small"
                  disabled={isAcquiringOwnership}
                  onClick={() => {
                    setShowAcquireOwnershipConfirmation(false);
                    setAcquireOwnershipError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Related resources
      <div className={styles.section}>
        <Text className={styles.label}>Related resources</Text>
        <Text className={styles.value}>None</Text>
      </div> */}

      {/*Custom fields*/}
      {renderCustomFields()}

      {/* Related Resources */}
      <RelatedResourcesList
        resources={relatedResources}
        isLoading={relatedResourcesLoading}
        error={relatedResourcesError}
        isOwner={isCurrentUserOwner}
        baseUrl={controller.getHermesBaseUrl()}
        onAdd={handleAddRelatedResource}
        onEdit={handleEditRelatedResource}
        onRemove={handleRemoveRelatedResource}
        onRetry={loadRelatedResources}
        onSearchDocuments={controller.searchDocuments.bind(controller)}
      />

      {/* Transfer Ownership - Only show to current owner */}
      {isCurrentUserOwner && (
        <div className={styles.section} style={{ marginTop: "24px", paddingTop: "16px", borderTop: `1px solid ${theme.border.subtle}` }}>
          <Text className={styles.label}>Transfer Ownership</Text>
          
          {!showTransferOwnership ? (
            <div
              className={styles.clickableField}
              onClick={() => setShowTransferOwnership(true)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = theme.background.tertiary;
                (e.currentTarget as HTMLDivElement).style.boxShadow = theme.shadows.small;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "";
              }}
              style={{ cursor: "pointer" }}
            >
              <Text className={styles.value} style={{ color: theme.interactive.primary }}>
                Transfer to another person...
              </Text>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <People
                label=""
                fieldLabel="Search people"
                peopleMap={peopleMap}
                emails={selectedNewOwner ? [selectedNewOwner.emailAddresses?.[0]?.value || ""] : []}
                update={async (emails: string[]) => {
                  if (emails.length > 0) {
                    // Find the person object for the selected email
                    const person = peopleMap.get(emails[0]);
                    if (person) {
                      setSelectedNewOwner(person);
                    } else {
                      // If person not in map, search for them
                      try {
                        const searchResults = await search(emails[0]);
                        if (searchResults.length > 0) {
                          setSelectedNewOwner(searchResults[0]);
                          setPeopleMap(new Map(peopleMap.set(emails[0], searchResults[0])));
                        }
                      } catch (err) {
                        console.error("Error searching for person:", err);
                      }
                    }
                  } else {
                    setSelectedNewOwner(null);
                  }
                }}
                search={search}
                createUrl={(person) => controller.createHermesUrlFromPerson(person)}
                mutatePeopleMap={(map) => setPeopleMap(new Map(map))}
                isMe={(email) => controller.isMe(email)}
                addGreenTick={() => false}
                disable={false}
              />
              
              {transferError && (
                <Text 
                  size={200} 
                  style={{ 
                    color: theme.interactive.danger, 
                    fontSize: "12px"
                  }}
                >
                  Error: {transferError}
                </Text>
              )}
              
              <div className={styles.rowSection}>
                <Button 
                  appearance="primary" 
                  size="medium"
                  disabled={!selectedNewOwner || isTransferring}
                  onClick={async () => {
                    if (!selectedNewOwner?.emailAddresses?.[0]?.value) {
                      setTransferError("Please select a valid person");
                      return;
                    }
                    
                    setIsTransferring(true);
                    setTransferError(null);
                    
                    try {
                      const newOwnerEmail = selectedNewOwner.emailAddresses[0].value;
                      
                      // Call the transfer ownership API
                      await controller.updateMetadata(
                        { owners: [newOwnerEmail] },
                        setDocMeta
                      );
                      
                      // Reset the transfer UI
                      setShowTransferOwnership(false);
                      setSelectedNewOwner(null);
                      
                      // Show success message (you might want to add a toast/notification system)
                      console.log(`Ownership transferred to ${newOwnerEmail}`);
                      
                    } catch (err: any) {
                      const errorMessage = handleMetadataUpdateError(err, "Transfer Ownership");
                      setTransferError(errorMessage);
                    } finally {
                      setIsTransferring(false);
                    }
                  }}
                >
                  {isTransferring ? "Transferring..." : "Confirm Transfer"}
                </Button>
                <Button 
                  appearance="secondary" 
                  size="medium"
                  disabled={isTransferring}
                  onClick={() => {
                    setShowTransferOwnership(false);
                    setSelectedNewOwner(null);
                    setTransferError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              
              {selectedNewOwner && (
                <div style={{ 
                  padding: "8px", 
                  backgroundColor: theme.status.warning.background, 
                  border: `1px solid ${theme.status.warning.border}`, 
                  borderRadius: "4px", 
                  fontSize: "12px",
                  color: theme.status.warning.text
                }}>
                  <strong style={{ color: theme.status.warning.text }}>Warning:</strong> You will no longer be able to edit this document metadata after transferring ownership to{" "}
                  <strong style={{ color: theme.text.primary }}>
                    {selectedNewOwner.names?.[0]?.displayName || selectedNewOwner.emailAddresses?.[0]?.value}
                  </strong>.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Archive/Unarchive Draft - Only show to current owner for drafts */}
      {isCurrentUserOwner && docMeta._isDraft && (
        <div className={styles.section} style={{ marginTop: "24px", paddingTop: "16px", borderTop: `1px solid ${theme.border.subtle}` }}>
          <Text className={styles.label}>{docMeta.archived ? "Unarchive Draft" : "Archive Draft"}</Text>
          
          {archiveError && (
            <Text 
              size={200} 
              style={{ 
                color: theme.interactive.danger, 
                fontSize: "12px",
                marginBottom: "8px"
              }}
            >
              Error: {archiveError}
            </Text>
          )}
          
          <Button
            appearance="secondary"
            className={styles.secondaryBtn}
            disabled={isArchiving}
            icon={docMeta.archived ? <ArchiveArrowBack24Regular /> : <Archive24Regular />}
            style={{
              color: theme.text.secondary,
              border: `1px solid ${theme.border.primary}`,
              backgroundColor: isArchiveHovered ? theme.background.tertiary : "transparent",
              borderColor: isArchiveHovered ? theme.border.secondary : theme.border.primary,
            }}
            onMouseEnter={() => setIsArchiveHovered(true)}
            onMouseLeave={() => setIsArchiveHovered(false)}
            onClick={async () => {
              setIsArchiving(true);
              setArchiveError(null);
              
              try {
                const newArchivedStatus = !docMeta.archived;
                await controller.setDraftArchivedStatus(newArchivedStatus, setDocMeta);
                
                console.log(`Draft ${newArchivedStatus ? 'archived' : 'unarchived'} successfully`);
              } catch (err: any) {
                console.error("Error updating archive status:", err);
                const errorMessage = err?.message || "Failed to update archive status";
                setArchiveError(errorMessage);
              } finally {
                setIsArchiving(false);
              }
            }}
          >
            {isArchiving 
              ? (docMeta.archived ? "Unarchiving..." : "Archiving...") 
              : (docMeta.archived ? "Unarchive Draft" : "Archive Draft")
            }
          </Button>
          
          <Text 
            size={200} 
            style={{ 
              color: theme.text.tertiary, 
              fontSize: "11px",
              marginTop: "8px",
              display: "block"
            }}
          >
            {docMeta.archived 
              ? "This draft is currently archived. Unarchive it to make it active again." 
              : "Archive this draft to move it out of your active drafts list."
            }
          </Text>
        </div>
      )}

      {docMeta._isDraft &&
        !docMeta.archived &&
        (controller.isCurrentUserIsOwner() ||
          controller.isCurrentUserContributor() ||
          controller.isCurrentApprover()) && (
          <div className={styles.floatingFooterSection} style={{ backgroundColor: theme.background.primary, borderTopColor: theme.border.primary }}>
            <div className={styles.rowSection}>
              <Button
                appearance="primary"
                className={styles.primaryBtn}
                disabled={disablePublish}
                onClick={async () => {
                  setDisablePublish(true);

                  try {
                    await controller.publishForReview(setDocMeta);
                  } finally {
                    setDisablePublish(false);
                  }
                }}
              >
                Publish for review...
              </Button>
            </div>
          </div>
        )}

      {!docMeta._isDraft &&
        (controller.isCurrentApprover() || isGroupApprover) &&
        !controller.isApprovedByCurrentUser() && (
          <div className={styles.floatingFooterSection} style={{ backgroundColor: theme.background.primary, borderTopColor: theme.border.primary }}>
            <Button
              appearance="primary"
              className={styles.primaryBtn}
              disabled={disableDelete}
              onClick={async () => {
                setDisableDelete(true);
                try {
                  await controller.approveDoc(setDocMeta);
                } finally {
                  setDisableDelete(false);
                }
              }}
            >
              Approve
            </Button>
          </div>
        )}
      {controller.isApprovedByCurrentUser() && (
        <div className={styles.floatingFooterSection} style={{ backgroundColor: theme.background.primary, borderTopColor: theme.border.primary }}>
          <Button className={styles.primaryBtn} disabled>
            Approved
          </Button>
        </div>
      )}
      </div>
    </>
  );
};

export default Sidebar;
