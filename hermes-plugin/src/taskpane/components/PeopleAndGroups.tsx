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
} from "@fluentui/react-components";
import { Edit16Regular, People24Regular, CheckmarkRegular, Dismiss24Regular } from "@fluentui/react-icons";
import { Person } from "../interfaces/person";
import { Group } from "../interfaces/group";
import DarkTheme, { commonStyles } from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";
import { useTheme } from "../utils/themeContext";

interface PeopleAndGroupsProps {
  label: string;
  peopleMap: Map<string, Person>;
  groupsMap: Map<string, Group>;
  emails: string[];
  update: (emails: string[]) => Promise<void>;
  searchPeople: (query: string) => Promise<Person[]>;
  searchGroups: (query: string) => Promise<Group[]>;
  createUrl: (person: Person) => string;
  mutatePeopleMap: (map: Map<string, Person>) => void;
  mutateGroupsMap: (map: Map<string, Group>) => void;
  isMe: (email: string) => boolean;
  addGreenTick?: (email: string) => boolean;
  disable?: boolean;
}

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
    alignItems: "center",
  },
  label: {
    color: DarkTheme.text.tertiary,
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  },
  value: {
    fontSize: "14px",
    color: DarkTheme.text.primary,
  },
  closeIcon: {
    position: "absolute",
    top: "8px",
    right: "8px",
    fontSize: "16px",
    cursor: "pointer",
    color: DarkTheme.text.tertiary,
    transition: "opacity 0.2s ease",
  },
  clickableField: {
    padding: "8px",
    borderRadius: "4px",
    transition: "background-color 0.2s ease, box-shadow 0.2s ease",
    position: "relative",
    cursor: "pointer",
  },
  clickableFieldDisabled: {
    padding: "8px",
    borderRadius: "4px",
    position: "relative",
  },
  buttonContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "8px",
    marginTop: "8px",
  },
  tagPicker: {
    backgroundColor: DarkTheme.background.secondary,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
    color: DarkTheme.text.primary,
  },
  tagPickerList: {
    backgroundColor: DarkTheme.background.elevated,
    border: `1px solid ${DarkTheme.border.primary}`,
    borderRadius: "4px",
    boxShadow: DarkTheme.shadows.medium,
    color: DarkTheme.text.primary,
  },
  tagPickerOption: {
    backgroundColor: DarkTheme.background.elevated,
    color: DarkTheme.text.primary,
    ":hover": {
      backgroundColor: DarkTheme.background.tertiary,
    },
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

const PeopleAndGroups: React.FC<PeopleAndGroupsProps> = ({
  label,
  peopleMap,
  groupsMap,
  emails,
  createUrl,
  update,
  searchPeople,
  searchGroups,
  mutatePeopleMap,
  mutateGroupsMap,
  isMe,
  addGreenTick,
  disable,
}) => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;
  const componentRef = React.useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(emails);
  const [tempSelectedOptions, setTempSelectedOptions] = React.useState<string[]>(emails);
  const [peopleOptions, setPeopleOptions] = React.useState<string[]>([]);
  const [groupOptions, setGroupOptions] = React.useState<string[]>([]);
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

  React.useEffect(() => {
    setSelectedOptions(emails);
    if (!showDropdown) {
      setTempSelectedOptions(emails);
    }
  }, [emails, showDropdown]);

  const search = React.useCallback(async (q: string) => {
    setQuery(q);
    if (!q || !q.trim()) {
      setPeopleOptions([]);
      setGroupOptions([]);
      return;
    }

    try {
      const [peopleResults, groupResults] = await Promise.all([
        searchPeople(q),
        searchGroups(q),
      ]);

      const newPeopleMap = new Map(peopleMap);
      const newPeopleOptions = (peopleResults || [])
        .map((person) => {
          const email = person.emailAddresses?.[0]?.value;
          if (!email) {
            return undefined;
          }
          newPeopleMap.set(email, person);
          return email;
        })
        .filter((email): email is string => Boolean(email) && !tempSelectedOptions.includes(email));

      const newGroupMap = new Map(groupsMap);
      const newGroupOptions = (groupResults || [])
        .map((group) => {
          if (!group.email) {
            return undefined;
          }
          newGroupMap.set(group.email, group);
          return group.email;
        })
        .filter((email): email is string => Boolean(email) && !tempSelectedOptions.includes(email));

      setPeopleOptions(newPeopleOptions);
      setGroupOptions(newGroupOptions);
      mutatePeopleMap(newPeopleMap);
      mutateGroupsMap(newGroupMap);
    } catch (error) {
      console.log("Search error:", error);
      setPeopleOptions([]);
      setGroupOptions([]);
    }
  }, [mutatePeopleMap, mutateGroupsMap, searchPeople, searchGroups, tempSelectedOptions]);

  const onOptionSelect: TagPickerProps["onOptionSelect"] = async (_, data) => {
    if (data.value === "no-matches") {
      return;
    }

    setTempSelectedOptions(data.selectedOptions);
    setQuery("");
  };

  const handleSave = async () => {
    await update(tempSelectedOptions);
    setSelectedOptions(tempSelectedOptions);
    setShowDropdown(false);
  };

  const handleCancel = () => {
    setTempSelectedOptions(selectedOptions);
    setQuery("");
    setPeopleOptions([]);
    setGroupOptions([]);
    setShowDropdown(false);
  };

  const renderEntries = (values: string[]) => {
    if (!values.length) {
      return <Text className={styles.value}>None</Text>;
    }

    return (
      <>
        {values.map((email) => {
          const group = groupsMap.get(email);
          if (group) {
            return (
              <div className={styles.rowSection} key={email}>
                <Avatar
                  name={group.name}
                  size={24}
                  icon={<People24Regular />}
                  shape="square"
                />
                <Text>{group.name}</Text>
              </div>
            );
          }

          const person = peopleMap.get(email);
          if (person) {
            const displayName = person.names?.[0]?.displayName || email;
            const showGreenTick = addGreenTick && addGreenTick(email);
            return (
              <div className={styles.rowSection} key={email}>
                <Avatar
                  name={displayName}
                  size={24}
                  image={{ src: createUrl(person) }}
                  badge={showGreenTick ? { status: "available" } : undefined}
                />
                <Text>{isMe(email) ? "Me" : displayName}</Text>
              </div>
            );
          }

          return (
            <div className={styles.rowSection} key={email}>
              <Avatar name={email} size={24} />
              <Text>{email}</Text>
            </div>
          );
        })}
      </>
    );
  };

  const noMatch = (
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

  const renderOptions = () => {
    const options: JSX.Element[] = [];

    // Show people first
    peopleOptions.forEach((email) => {
      const person = peopleMap.get(email);
      if (person) {
        const name = isMe(email) ? "Me" : person.names?.[0]?.displayName || email;
        options.push(
          <TagPickerOption
            key={email}
            value={email}
            secondaryContent={email}
            media={<Avatar shape="square" aria-hidden name={name} image={{ src: createUrl(person) }} />}
            style={{
              backgroundColor: theme.background.elevated,
              color: theme.text.primary,
            }}
          >
            {name}
          </TagPickerOption>
        );
      } else {
        options.push(
          <TagPickerOption
            key={email}
            value={email}
            media={<Avatar shape="square" aria-hidden name={email} color="colorful" />}
            style={{
              backgroundColor: theme.background.elevated,
              color: theme.text.primary,
            }}
          >
            {email}
          </TagPickerOption>
        );
      }
    });

    // Then show groups
    groupOptions.forEach((email) => {
      const group = groupsMap.get(email);
      if (group) {
        options.push(
          <TagPickerOption
            key={email}
            value={email}
            secondaryContent="Group"
            media={<Avatar shape="square" aria-hidden name={group.name} icon={<People24Regular />} />}
            style={{
              backgroundColor: theme.background.elevated,
              color: theme.text.primary,
            }}
          >
            {group.name}
          </TagPickerOption>
        );
      }
    });

    return options.length ? options : [noMatch];
  };

  const renderDropdown = () => (
    <>
      <Field
        label={`Select ${label}`}
        className={styles.fieldLabel}
      >
        <TagPicker onOptionSelect={onOptionSelect} selectedOptions={tempSelectedOptions}>
          <TagPickerControl
            className={styles.tagPickerControl}
            style={commonStyles.tagPickerControl}>
            <TagPickerGroup aria-label={`Selected ${label}`} style={commonStyles.tagPickerGroup}>
              {tempSelectedOptions.map((option) => {
                const group = groupsMap.get(option);
                if (group) {
                  return (
                    <Tag
                      key={option}
                      shape="rounded"
                      value={option}
                      media={<Avatar aria-hidden name={group.name} icon={<People24Regular />} />}
                    >
                      {group.name}
                    </Tag>
                  );
                }

                const person = peopleMap.get(option);
                if (person) {
                  const name = isMe(option)
                    ? "Me"
                    : person.names?.[0]?.displayName || option;
                  return (
                    <Tag
                      key={option}
                      shape="rounded"
                      value={option}
                      media={
                        <Avatar
                          aria-hidden
                          name={name}
                          image={{ src: createUrl(person) }}
                        />
                      }
                    >
                      {name}
                    </Tag>
                  );
                }

                return (
                  <Tag key={option} shape="rounded" value={option}>
                    {option}
                  </Tag>
                );
              })}
            </TagPickerGroup>
            <TagPickerInput
              aria-label={`Select ${label}`}
              placeholder={`Search ${label}...`}
              value={query}
              onChange={(event) => search(event.target.value)}
              className={styles.tagPickerInput}
              style={{ minWidth: "100px", flexGrow: 1 }}
            />
          </TagPickerControl>
          <TagPickerList style={{
            backgroundColor: theme.background.elevated,
            border: `1px solid ${theme.border.primary}`,
            color: theme.text.primary,
            boxShadow: theme.shadows.medium,
          }}>{renderOptions()}</TagPickerList>
        </TagPicker>
      </Field>
      <div className={styles.buttonContainer}>
        <Button
          className={styles.primaryButton}
          appearance="primary"
          icon={<CheckmarkRegular />}
          onClick={handleSave}
        >
          Save
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={handleCancel}
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
    </>
  );

  const handleOpenDropdown = () => {
    setTempSelectedOptions(selectedOptions);
    setShowDropdown(true);
    // Auto-scroll to top after a brief delay to ensure dropdown renders
    setTimeout(() => scrollFieldToTop(), 100);
  };

  const handleCloseDropdown = () => {
    setTempSelectedOptions(selectedOptions);
    setQuery("");
    setPeopleOptions([]);
    setGroupOptions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={componentRef} className={styles.section}>
      <Text className={styles.label}>{label}</Text>
      {showDropdown && !disable ? (
        renderDropdown()
      ) : (
        <div
          className={!disable ? styles.clickableField : styles.clickableFieldDisabled}
          onClick={!disable ? handleOpenDropdown : undefined}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            cursor: !disable ? "pointer" : "default",
            backgroundColor: isHovered && !disable ? theme.background.tertiary : "transparent",
            boxShadow: isHovered && !disable ? theme.shadows.small : undefined,
          }}
        >
          <div className={styles.section}>{renderEntries(selectedOptions)}</div>
          {!disable && (
            <Edit16Regular
              className={styles.closeIcon}
              style={{
                opacity: isHovered ? 1 : 0,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PeopleAndGroups;
