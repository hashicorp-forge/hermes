import * as React from "react";
import { Tooltip } from "@fluentui/react-components";
import { WeatherSunny16Regular, WeatherMoon16Regular } from "@fluentui/react-icons";
import { useTheme } from "../utils/themeContext";
import DarkTheme from "../utils/darkTheme";
import LightTheme from "../utils/lightTheme";

const ThemeToggleButton: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <Tooltip
      content={isDark ? "Switch to light theme" : "Switch to dark theme"}
      relationship="description"
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "30px",
          height: "30px",
          borderRadius: "6px",
          border: `1px solid ${theme.border.primary}`,
          backgroundColor: "transparent",
          color: theme.text.secondary,
          cursor: "pointer",
          transition: "all 0.2s ease",
          flexShrink: 0,
        }}
        // onMouseEnter={(e) => {
        //   (e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.background.tertiary;
        //   (e.currentTarget as HTMLButtonElement).style.color = theme.text.primary;
        // }}
        // onMouseLeave={(e) => {
        //   (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        //   (e.currentTarget as HTMLButtonElement).style.color = theme.text.secondary;
        // }}
      >
        {isDark ? (
          <WeatherSunny16Regular />
        ) : (
          <WeatherMoon16Regular />
        )}
      </button>
    </Tooltip>
  );
};

export default ThemeToggleButton;
