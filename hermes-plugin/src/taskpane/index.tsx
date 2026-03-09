import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webDarkTheme, webLightTheme } from "@fluentui/react-components";
import { getHeaders, insertText } from "./taskpane";
import HermesClient from "./utils/hermesClient";
import Config from "../config.json";
import WordService from "./utils/wordService";
import WordPluginController from "./utils/wordPluginController";

/* global document, Office, module, require, HTMLElement */

const title = "Hermes";

const rootElement: HTMLElement | null = document.getElementById("container");
const root = rootElement ? createRoot(rootElement) : undefined;

/* Render application after Office initializes */
Office.onReady(async () => {
  let baseUrl = window.location.origin; // Default fallback
  
  // Check if useHostUrl flag is set to true
  if (Config.useHostUrl === true) {
    // Use current host dynamically
    baseUrl = window.location.origin;
    console.log('Using dynamic host URL:', baseUrl);
  } else {
    // Use static baseUrl from config.json
    if (Config.baseUrl) {
      baseUrl = Config.baseUrl;
      console.log('Using static baseUrl from config.json:', baseUrl);
    } else {
      console.log('No baseUrl in config.json, using host URL:', baseUrl);
    }
  }
  
  const hermesClient = new HermesClient(baseUrl);
  const wordSvc = new WordService();

  const controller = new WordPluginController(hermesClient, wordSvc);
  OfficeExtension.config.extendedErrorLogging = true;
  const theme = Office.context.officeTheme.isDarkTheme ? webDarkTheme : webLightTheme;
  root?.render(
    <FluentProvider theme={theme}>
      <App controller={controller} />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/App", () => {
    const NextApp = require("./components/App").default;
    root?.render(NextApp);
  });
}
