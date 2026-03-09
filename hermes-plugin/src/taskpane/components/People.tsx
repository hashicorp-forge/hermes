import * as React from "react";
import {
  Avatar,
  Button,
  Field,
  makeStyles,
  Tag,
  TagPicker,
  TagPickerControl,
  TagPickerGroup,
  TagPickerInput,
  TagPickerList,
  TagPickerOption,
  TagPickerProps,
  Text,
  useTagPickerFilter,
} from "@fluentui/react-components";
import { Person } from "../interfaces/person";
import WordPluginController from "../utils/wordPluginController";
import {
  Dismiss24Regular,
  Checkmark24Regular,
  Edit16Regular,
} from "@fluentui/react-icons";
import DarkTheme, { commonStyles } from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

type PeopleProps = {
  label: string;
  fieldLabel?: string; // Optional custom field label, defaults to "Select ${label}"
  peopleMap: Map<string, Person>;
  emails: string[];
  update: (emails: string[]) => Promise<void>;
  search: (query: string) => Promise<Person[]>;
  createUrl: (person: Person) => string;
  mutatePeopleMap: (map: Map<string, Person>) => void;
  isMe: (email: string) => boolean;
  addGreenTick?: (email: string) => boolean;
  disable?: boolean;
};

const useStyles = makeStyles({
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
  actionButtons: {
    display: "flex",
    gap: "8px",
    marginTop: "8px",
  },
  clickableField: {
    padding: "8px",
    borderRadius: "4px",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
  },
  clickableFieldDisabled: {
    padding: "8px",
    borderRadius: "4px",
  },
  editIcon: {
    position: "absolute",
    top: "4px",
    right: "4px",
    transition: "opacity 0.2s ease",
    color: DarkTheme.text.tertiary,
    fontSize: "14px",
    pointerEvents: "none",
  },
  tagPickerInput: {
    backgroundColor: DarkTheme.background.secondary,
    border: "none",
    color: DarkTheme.text.primary,
    minWidth: "100px",
    flexShrink: 0,
    flexGrow: 1,
    "&::placeholder": {
      color: DarkTheme.components.input.placeholder,
    },
  },
  tagPickerControl: {
    display: "flex",
    flexWrap: "wrap" as const,
    minHeight: "44px",
    alignItems: "center",
  },
  fieldLabel: {
    "& label": {
      ...commonStyles.fieldLabel,
    },
  },
  primaryButton: commonStyles.primaryButton,
  errorText: {
    fontSize: "12px",
    marginTop: "4px",
  },
});

const People = ({
  label,
  fieldLabel,
  peopleMap,
  emails,
  createUrl,
  update,
  search,
  mutatePeopleMap,
  isMe,
  addGreenTick,
  disable,
}: PeopleProps) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;

  const [showDropdown, setShowDropdown] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedOptions, setSelectedOptions] = React.useState(emails);
  const [originalOptions, setOriginalOptions] = React.useState(emails);
  const [options, setOptions] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const tagPickerRef = React.useRef<HTMLDivElement>(null);
  const componentRef = React.useRef<HTMLDivElement>(null);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const [isSearching, setIsSearching] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isCancelHovered, setIsCancelHovered] = React.useState(false);

  // Auto-scroll function to bring field to top
  const scrollFieldToTop = () => {
    if (componentRef.current) {
      componentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const searchPeople = React.useCallback((q: string) => {
    // Ensure q is a string
    const query = q || "";

    // Update query immediately for responsive UI
    setQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, clear options and stop searching immediately
    if (!query.trim()) {
      setOptions([]);
      setIsSearching(false);
      return;
    }

    // Set searching state to prevent render during updates
    setIsSearching(true);

    // Debounce the actual search with longer delay for more stability
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const people = await search(query);

        if (people) {
          // Process people data
          const newOptions: string[] = [];
          people.forEach((person) => {
            const email = person.emailAddresses[0].value;
            peopleMap.set(email, person);
            if (!selectedOptions.includes(email)) {
              newOptions.push(email);
            }
          });

          // Use double requestAnimationFrame for extra stability
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setOptions(newOptions);
              mutatePeopleMap(peopleMap);
              setIsSearching(false);
            });
          });
        }
      } catch (error) {
        console.log(error);
        requestAnimationFrame(() => {
          setOptions([]);
          setIsSearching(false);
        });
      }
    }, 500); // Increased delay for stability
  }, [search, selectedOptions, peopleMap, mutatePeopleMap]);

  const onOptionSelect: TagPickerProps["onOptionSelect"] = React.useCallback((_, data) => {
    if (data.value === "no-matches") {
      return;
    }

    // Use requestAnimationFrame to defer updates and prevent layout thrashing
    requestAnimationFrame(() => {
      setSelectedOptions(data.selectedOptions);
      setQuery("");
      // Clear options when selection is made to prevent dropdown size issues
      setOptions([]);
    });
  }, []);

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    setError(null); // Clear previous errors
    try {
      await update(selectedOptions);
      setOriginalOptions([...selectedOptions]);
      setShowDropdown(false);
    } catch (err: any) {
      console.error("People component - Failed to save changes:", err);

      // Extract HTTP status code from error
      let statusCode = "";

      if (err.response) {
        // Axios-style HTTP error response
        statusCode = `${err.response.status}`;
        console.log("People - Found axios-style error with status:", statusCode);
      } else if (err.message) {
        // Parse HermesClient error format for status code
        const statusMatch = err.message.match(/status:\s*(\d+)/);
        if (statusMatch) {
          statusCode = statusMatch[1];
          console.log("People - Found HermesClient error with status:", statusCode);
        }
      }

      let fullError = "Server Error";
      if (statusCode === "403") {
        fullError = "Permission Denied, Only Owners can update the metadata.";
      } else if (statusCode) {
        fullError = `Server Responded : ${statusCode}`;
      }

      setError(fullError);

      // IMPORTANT: Don't call setShowDropdown(false) here - keep field open to show error
      console.log("People field should stay open to show error");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    // First reset the selected options
    setSelectedOptions([...originalOptions]);
    // Clear any search query
    setQuery("");
    // Clear any error messages
    setError(null);
    // Blur any focused elements to close dropdowns
    if (tagPickerRef.current) {
      const focusedElement = tagPickerRef.current.querySelector(':focus') as HTMLElement;
      if (focusedElement) {
        focusedElement.blur();
      }
    }
    // Then close the dropdown
    setShowDropdown(false);
  };

  // Update original options when emails prop changes
  React.useEffect(() => {
    setOriginalOptions(emails);
    if (!showDropdown) {
      setSelectedOptions(emails);
    }
  }, [emails, showDropdown]);



  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const renderPeople = (emails: string[]) => {
    return emails.map((email, index) => {
      const personDetails = peopleMap.get(email);
      const showApprovalTick = addGreenTick && addGreenTick(email);

      return (
        <div className={styles.rowSection} key={index}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <Avatar
              name={personDetails?.names[0].displayName || email}
              size={24}
              key={index}
              image={{
                src: createUrl(personDetails),
              }}
            />
            {showApprovalTick && (
              <div style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                backgroundColor: theme.background.success,
                borderRadius: "50%",
                width: "12px",
                height: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid white"
              }}>
                <Checkmark24Regular style={{
                  color: "white",
                  fontSize: "8px",
                  width: "8px",
                  height: "8px"
                }} />
              </div>
            )}
          </div>
          <Text>{isMe(email) ? "Me" : personDetails?.names[0].displayName || email}</Text>
        </div>
      );
    });
  };

  const noMatch = () => (
    <TagPickerOption
      value="no-matches"
      style={{
        backgroundColor: theme.background.elevated,
        color: theme.text.tertiary,
      }}
    >
      No matches found
    </TagPickerOption>
  );

  const renderList = () => {
    // Show all results but rely on scrolling in the dropdown
    const optionElements = options.map((email) => {
      const person = peopleMap.get(email);

      if (!person) {
        return (
          <TagPickerOption
            key={email}
            media={<Avatar shape="square" aria-hidden name={email} color="colorful" />}
            value={email}
            style={{
              backgroundColor: theme.background.elevated,
              color: theme.text.primary,
            }}
          >
            {email}
          </TagPickerOption>
        );
      }

      const name = isMe(email) ? "Me" : person.names[0].displayName;
      const url = createUrl(person);

      return (
        <TagPickerOption
          secondaryContent={email}
          key={name}
          media={<Avatar shape="square" aria-hidden name={name} image={{ src: url }} />}
          value={email}
          style={{
            backgroundColor: theme.background.elevated,
            color: theme.text.primary,
          }}
        >
          {name}
        </TagPickerOption>
      );
    });

    return optionElements;
  };

  const renderDropdown = () => {
    return (
      <div ref={tagPickerRef} data-people-dropdown={label}>
        <Field
          label={fieldLabel || `Select ${label}`}
          className={styles.fieldLabel}
        >
          <TagPicker onOptionSelect={onOptionSelect} selectedOptions={selectedOptions}>
            <TagPickerControl
              className={styles.tagPickerControl}
              style={{
                ...commonStyles.tagPickerControl,
                flexWrap: "wrap",
                minHeight: "44px",
                padding: "4px",
                gap: "4px",
              }}>
              <TagPickerGroup aria-label={`Selected ${label}`} style={commonStyles.tagPickerGroup}>
                {selectedOptions.map((option) => {
                  const people = peopleMap.get(option);

                  return (
                    <Tag
                      key={option}
                      shape="rounded"
                      value={option}
                      media={
                        <Avatar
                          aria-hidden
                          name={people?.names[0]?.displayName || option}
                          image={{
                            src: people ? createUrl(people) : undefined,
                          }}
                        />
                      }
                    >
                      {people && isMe(people.emailAddresses[0].value) ? "Me" : people?.names[0]?.displayName || option}
                    </Tag>
                  );
                })}
              </TagPickerGroup>
              <TagPickerInput
                aria-label={`Select ${label}`}
                placeholder={`Search ${label}...`}
                value={query}
                onChange={(e) => searchPeople(e.target.value)}
                className={styles.tagPickerInput}
                style={{ minWidth: "100px", flexGrow: 1 }}
              />
            </TagPickerControl>
            <TagPickerList style={commonStyles.tagPickerList}>
              {isSearching ? (
                <div style={{
                  padding: '8px',
                  minHeight: '40px',
                  color: theme.text.tertiary,
                  backgroundColor: theme.background.elevated,
                }}>Searching...</div>
              ) : (
                options.length > 0 ? renderList() : noMatch()
              )}
            </TagPickerList>
          </TagPicker>
        </Field>

        {/* Action buttons - always show when in edit mode */}
        <div className={styles.actionButtons}>
          <Button
            className={styles.primaryButton}
            appearance="primary"
            icon={<Checkmark24Regular />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            appearance="secondary"
            icon={<Dismiss24Regular />}
            onClick={handleCancel}
            disabled={isSaving}
            onMouseEnter={() => setIsCancelHovered(true)}
            onMouseLeave={() => setIsCancelHovered(false)}
            style={{
              backgroundColor: isCancelHovered ? theme.background.tertiary : "transparent",
              color: isCancelHovered ? theme.text.primary : theme.text.secondary,
              border: `1px solid ${isCancelHovered ? theme.border.secondary : theme.border.primary}`,
              borderRadius: "4px",
              fontWeight: "500",
            }}
          >
            Cancel
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <Text
            className={styles.errorText}
            size={200}
            style={{
              marginTop: "8px",
              fontSize: "12px",
              display: "block",
              color: theme.interactive.danger,
            }}
          >
            Error: {error}
          </Text>
        )}
      </div>
    );
  };

  return (
    <div ref={componentRef} className={styles.section}>
      <Text className={styles.label}>
        {label}
      </Text>
      {showDropdown ? (
        renderDropdown()
      ) : (
        <div
          className={!disable ? styles.clickableField : styles.clickableFieldDisabled}
          onClick={!disable ? () => {
            setShowDropdown(true);
            // Auto-scroll to top after a brief delay to ensure dropdown renders
            setTimeout(() => scrollFieldToTop(), 100);
          } : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            cursor: !disable ? "pointer" : "default",
            backgroundColor: isHovered && !disable ? theme.background.tertiary : "transparent",
            boxShadow: isHovered && !disable ? theme.shadows.small : undefined,
          }}
        >
          {originalOptions && originalOptions.length !== 0 ? (
            <div className={styles.section}>{renderPeople(originalOptions)}</div>
          ) : (
            <Text className={styles.value}>None</Text>
          )}
          {!disable && (
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

export default People;
