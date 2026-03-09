import IDocumentMetadata from "../interfaces/documentMetadata";

type WordProperties = Word.Interfaces.DocumentPropertiesData;

export default class WordService {
  // Color for field keys to ensure good contrast in both light and dark modes
  // Using the same color as the header table title for consistency
  private static readonly FIELD_KEY_COLOR = "#0f4761";

  /**
   * Retrieves the properties of the current Word document.
   *
   * @returns A promise that resolves to the document's properties as a `WordProperties` object.
   * @throws Will reject the promise if the operation fails.
   *
   * @example
   * ```typescript
   * const properties = await wordService.getDocProperties();
   * console.log(properties);
   * ```
   */
  public async getDocProperties(): Promise<WordProperties> {
    return new Promise((resolve, reject) => {
      Word.run(async (ctx) => {
        try {
          const props = ctx.document.properties.load();
          await ctx.sync();
          resolve(props.toJSON());
        } catch (error) {
          console.log("getDocProperties failed with error", error.debugInfo);
          reject(error);
        }
      });
    });
  }

  /**
   * Checks if the document can be edited by testing actual write capabilities.
   * This is more reliable than checking change tracking mode.
   * 
   * @returns A promise that resolves to true if document can be edited, false if read-only
   */
  public async isDocumentInEditMode(): Promise<boolean> {
    return new Promise((resolve) => {
      Word.run(async (ctx) => {
        try {
          const body = ctx.document.body;
          
          // Try to get a custom property to test write access
          // This is a lightweight operation that will fail if document is truly locked
          const customProps = ctx.document.properties.customProperties;
          customProps.load("items");
          await ctx.sync();
          
          // Check if change tracking is enabled - if so, updates will create suggestions
          const doc = ctx.document;
          doc.load("changeTrackingMode");
          await ctx.sync();
          
          const hasChangeTracking = doc.changeTrackingMode !== Word.ChangeTrackingMode.off;
          
          if (hasChangeTracking) {
            console.log("Document has change tracking enabled. Updates will create suggestions.");
            resolve(false);
            return;
          }
          
          // If we got here, document appears editable
          console.log("Document is in edit mode without change tracking.");
          resolve(true);
          
        } catch (error) {
          console.log("Error checking document edit mode:", error);
          
          // Check if error indicates read-only or locked state
          const errorMsg = error?.message || error?.toString() || "";
          if (errorMsg.includes("read-only") || 
              errorMsg.includes("ReadOnly") || 
              errorMsg.includes("locked") ||
              errorMsg.includes("protected")) {
            console.log("Document appears to be read-only or locked.");
            resolve(false);
          } else {
            // Unknown error, assume we can edit to avoid blocking legitimate updates
            console.log("Unknown error, defaulting to allow edits.");
            resolve(true);
          }
        }
      });
    });
  }

  /**
   * Updates the document headers by creating a new header table with the provided metadata.
   * Uses a simple check-and-update approach to prevent duplicate tables.
   * Only updates if the document is in edit mode (not review mode).
   *
   * @param headers - The metadata to be used for updating the document headers.
   * @throws Will throw an error if the header table cannot be updated or if any operation fails.
   */
  public async updateDocumentHeaders(headers: IDocumentMetadata) {
    // Check if document is in edit mode
    const isEditMode = await this.isDocumentInEditMode();
    
    if (!isEditMode) {
      console.log("Document is in review mode. Skipping metadata update to avoid creating suggestions.");
      return;
    }
    
    // Simple approach: check for existing tables and clean them up first
    try {
      const rows = this.getFormattedRows(headers);
      
      await Word.run(async (ctx) => {
        // First, find and remove ALL existing header tables
        const headerTables = await this.getExisitingHeaderTables(ctx, headers.docType);
        
        console.log(`Found ${headerTables.length} existing header tables to remove`);
        
        // Delete all existing header tables first
        headerTables.forEach((headerTable) => {
          headerTable.delete();
        });
        
        await ctx.sync();
        
        // Small delay to ensure deletion is processed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Now create the new header table
        await this.createHeaderTable(ctx, rows, headers);
        
        await ctx.sync();
        console.log("Header table updated successfully");
      });
    } catch (error) {
      console.log("Error during updateDocumentHeaders: ", error);
      throw error;
    }
  }

  /**
   * Creates and inserts a styled header table into the Word document body.
   *
   * The table consists of multiple rows, with the first row styled as a title and the second as a summary.
   * The function applies custom styles, merges cells for the header and summary, and enhances the appearance
   * of specific cells. If an error occurs during creation, the partially created table is deleted.
   *
   * @param ctx - The Word.RequestContext used to interact with the Word document.
   * @param rows - A 2D array of strings representing the content of each row in the table.
   * @param headers - The document metadata containing project details for hyperlinks.
   * @returns A Promise that resolves when the table has been created and styled.
   */
  async createHeaderTable(ctx: Word.RequestContext, rows: string[][], headers?: IDocumentMetadata) {
    let table: Word.Table;
    try {
      console.log("Creating table with structure:", rows);
      console.log(`Table dimensions: ${rows.length} rows x 2 columns`);
      
      const doc = ctx.document.body.load();
      await ctx.sync();

      table = doc.insertTable(rows.length, 2, "Start", rows);
      table.style = "Normal";

      table.getBorder(Word.BorderLocation.inside).type = "None";
      table.getBorder(Word.BorderLocation.left).type = "None";
      table.getBorder(Word.BorderLocation.right).type = "None";

      const titleRow = table.getCell(0, 0);

      titleRow.body.font.set({
        size: 17,
        color: "0f4761",
      });
      titleRow.horizontalAlignment = "Left";

      const summaryTitle = table.getCell(1, 0);
      summaryTitle.setCellPadding("Top", 10);
      summaryTitle.setCellPadding("Bottom", 15);

      summaryTitle.body.font.set({
        size: 11,
      });
      summaryTitle.horizontalAlignment = "Left";
      table.mergeCells(0, 0, 0, 1);
      table.mergeCells(1, 0, 1, 1);

      table.load();
      await ctx.sync();

      await this.enhanceCellAppearance(ctx, table.getCell(1, 0), true);
      for (let i = 2; i < table.rowCount; i++) {
        const cell = table.getCellOrNullObject(i, 0);
        await this.enhanceCellAppearance(ctx, cell);
        const nextCell = table.getCellOrNullObject(i, 1);
        await this.enhanceCellAppearance(ctx, nextCell);
        
        // Check if this is the NOTE row (last row) and merge cells
        if (i === table.rowCount - 1) {
          // Load cell content to check if it's the NOTE row
          cell.load("body/text");
          await ctx.sync();
          
          if (cell.body.text && cell.body.text.includes("NOTE:")) {
            // Merge the NOTE row across both columns
            table.mergeCells(i, 0, i, 1);
          }
        }
        
        // Always add hyperlinks for both projects and NOTE content - check both columns
        const projectDetails = headers?.projectDetails || [];
        await this.addHyperlinks(ctx, cell, projectDetails, headers?.baseUrl, headers);
        await this.addHyperlinks(ctx, nextCell, projectDetails, headers?.baseUrl, headers);
      }

      await ctx.sync();
    } catch (err) {
      console.log("Error in table creation:", err);
      // Don't try to delete the table here as it may cause object lifecycle issues
      // The table creation failure will be handled by trying again
      throw err;
    }
  }

  /**
   * Enhances the appearance of a Word table cell by optionally resizing the font and bolding the key portion of the cell's text.
   *
   * @param ctx - The Word.RequestContext used to queue commands for the Word document.
   * @param ptr - The Word.TableCell object representing the cell to enhance.
   * @param skipResize - Optional. If true, skips resizing the font. Defaults to false.
   * @returns A Promise that resolves when the appearance enhancements are complete.
   */
  async enhanceCellAppearance(
    ctx: Word.RequestContext,
    ptr: Word.TableCell,
    skipResize: boolean = false
  ) {
    const cell = ptr.body.load();
    await ctx.sync();
    if (cell.isNullObject) {
      return;
    }

    const originalText = cell.text || "";
    if (!skipResize) {
      cell.font.set({
        size: 9,
      });
    }

    let [key, value] = originalText.split(":");
    key = (key || "").trim();
    value = (value || "").trim();

    if (!key || key === null || typeof key === "undefined" || key === "") {
      return;
    }

    // Special formatting for Status field
    if (key === "Status" && value) {
      // Find and bold the current status within the pipe-separated list
      const statuses = ["WIP", "In-Review", "Approved", "Obsolete", "ARCHIVED"];
      let activeStatusFound = false;
      
      for (const status of statuses) {
        const markedStatus = `**${status}**`;
        if (value.includes(markedStatus)) {
          try {
            // Remove the ** markers and make it bold with color
            const cleanedText = cell.text.replace(markedStatus, status);
            cell.clear();
            cell.insertText(cleanedText, "Replace");
            
            // Re-bold the key part after text replacement
            const keyObjs = cell.search(key).load();
            await ctx.sync();
            
            if (keyObjs.items.length > 0) {
              keyObjs.getFirst().font.set({
                bold: true,
                color: WordService.FIELD_KEY_COLOR,
              });
            }
            
            // Now find and format the active status
            const activeStatusObjs = cell.search(status).load();
            await ctx.sync();
            
            if (activeStatusObjs.items.length > 0) {
              // Find the exact match in the status list context
              const statusIndex = cleanedText.indexOf(` ${status} `);
              const statusAtEnd = cleanedText.endsWith(` ${status}`);
              const statusAtStart = cleanedText.includes(`${status} |`);
              
              if (statusIndex > -1 || statusAtEnd || statusAtStart) {
                activeStatusObjs.getFirst().font.set({
                  bold: true,
                  color: this.getStatusColor(status),
                  size: 11, // Increase font size by 1 (from default 9 to 10)
                });
              }
            }
            activeStatusFound = true;
            break; // Only one status should be active
          } catch (error) {
            console.log(`Error formatting status ${status}:`, error);
            // Continue to try other statuses or fall back to regular key bolding
          }
        }
      }
      
      // Fallback: if no active status was formatted, just bold the key
      if (!activeStatusFound) {
        const keyObjs = cell.search(key).load();
        await ctx.sync();
        
        if (keyObjs.items.length > 0) {
          keyObjs.getFirst().font.set({
            bold: true,
            color: WordService.FIELD_KEY_COLOR,
          });
        }
      }
    } else {
      // Bold the key part for all other fields
      const keyObjs = cell.search(key).load();
      await ctx.sync();

      if (keyObjs.items.length > 0) {
        keyObjs.getFirst().font.set({
          bold: true,
          color: WordService.FIELD_KEY_COLOR,
        });
      }
    }
  }

  /**
   * Gets the appropriate color for a status based on the requirements:
   * WIP - Orange, In-Review - Purple, Approved - Green, Obsolete - Grey
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case "WIP":
        return "#a55818ff"; // Orange
      case "In-Review":
        return "#8337cfff"; // Purple  
      case "Approved":
        return "#035f25ff"; // Green
      case "Obsolete":
        return "#57709bff"; // Grey
      case "ARCHIVED":
        return "#FF0000"; // Red
      default:
        return "#000000"; // Black fallback
    }
  }

  /**
   * Searches for and returns the first table in the Word document body that contains a header matching the specified document type.
   *
   * @param ctx - The Word.RequestContext used to interact with the Word document.
   * @param docType - The document type to search for in table headers. The search is performed using the uppercase form of this string, wrapped in square brackets (e.g., `[DOCTYPE]`).
   * @returns A promise that resolves to the first matching Word.Table if found, or `null` if no such table exists.
   */
  async getExisitingHeaderTables(ctx: Word.RequestContext, docType: string) {
    const body = ctx.document.body.load();
    await ctx.sync();

    const allTables = body.tables.load();
    await ctx.sync();

    if (allTables.isNullObject) return null;

    let headerTable: Word.Table;

    const tables: Word.Table[] = [];

    for (const table of allTables.items) {
      const res = table.search(`[${docType.toUpperCase()}]`).load();
      await ctx.sync();
      if (res.items.length !== 0) {
        tables.push(table);
      }
    }

    return tables;
  }

  /**
   * Formats document metadata into a two-dimensional string array for display or export.
   *
   * The first rows include the document title and summary, followed by rows of key-value pairs
   * for required metadata fields (such as created, status, product, owners, etc.), and any custom
   * editable fields defined in the metadata. Each row contains up to two columns, and new rows
   * are started as needed.
   *
   * @param headers - The document metadata object containing standard and custom fields.
   * @returns A two-dimensional array of strings, where each inner array represents a row of formatted metadata.
   */
  private getFormattedRows(headers: IDocumentMetadata): string[][] {
    const requiredHeaderKeys: Partial<keyof IDocumentMetadata>[] = [
      "created",
      "status",
      "product",
      "owners",
      "contributors",
      "approvers",
      "projects",
    ];
    const title = `[${headers.docType.toUpperCase()}] [${headers.docNumber}]: ${headers.title}`;
    const summaryValue = (headers.summary && headers.summary.trim()) ? headers.summary.trim() : "N/A";
    const data: string[][] = [[title], [`Summary: ${summaryValue}`], []];

    for (const key of requiredHeaderKeys) {
      if (data[data.length - 1].length === 2) data.push([]);
      const capKey = key[0].toUpperCase() + key.slice(1);
      let value = "";

      if (key === "status") {
        // Check if document is archived first
        if (headers.archived) {
          value = "**ARCHIVED**"; // This will be formatted with red color
        } else {
          // Special formatting for status: WIP | In-Review | Approved | Obsolete
          const currentStatus = headers._isDraft ? "WIP" : (headers.status || "WIP");
          const allStatuses = ["WIP", "In-Review", "Approved", "Obsolete"];
          
          // Ensure currentStatus is valid, fallback to WIP if not
          const validStatus = allStatuses.includes(currentStatus) ? currentStatus : "WIP";
          
          value = allStatuses.map(status => {
            if (status === validStatus) {
              return `**${status}**`; // Bold the current status
            }
            return status;
          }).join(" | ");
        }
      } else if (key === "approvers") {
        const approversList = this.getApproverDisplayList(headers);
        value = approversList.length > 0 ? approversList.join(", ") : "N/A";
      } else if (key === "projects") {
        // Use project details if available, otherwise fall back to IDs
        if (headers.projectDetails && headers.projectDetails.length > 0) {
          value = headers.projectDetails.map(project => project.title).join(", ");
        } else if (Array.isArray(headers[key]) && headers[key].length > 0) {
          const arrayValue = headers[key].filter(Boolean);
          value = arrayValue.length > 0 ? arrayValue.join(", ") : "N/A";
        } else {
          value = "N/A";
        }
      } else if (
        typeof headers[key] === "string" ||
        typeof headers[key] === "number"
      ) {
        const stringValue = `${headers[key]}`.trim();
        value = (stringValue && stringValue !== "undefined" && stringValue !== "null") ? stringValue : "N/A";
      } else if (Array.isArray(headers[key])) {
        const arrayValue = headers[key].filter(Boolean); // Remove empty/null values
        value = arrayValue.length > 0 ? arrayValue.join(", ") : "N/A";
      } else {
        value = "N/A";
      }

      const col = `${capKey}: ${value}`;
      data[data.length - 1].push(col);
    }

    // now we handle the custom headers
    if (headers.customEditableFields) {
      for (const key of Object.keys(headers.customEditableFields)) {
        if (data[data.length - 1].length === 2) data.push([]);
        const capKey = headers.customEditableFields[key].displayName;
        let value = "";

        if (typeof headers[key] === "string" || typeof headers[key] === "number") {
          const stringValue = `${headers[key]}`.trim();
          value = (stringValue && stringValue !== "undefined" && stringValue !== "null") ? stringValue : "N/A";
        } else if (Array.isArray(headers[key])) {
          const arrayValue = headers[key].filter(Boolean); // Remove empty/null values
          value = arrayValue.length > 0 ? arrayValue.join(", ") : "N/A";
        } else {
          value = "N/A";
        }

        const col = `${capKey}: ${value}`;
        data[data.length - 1].push(col);
      }
    }

    // Ensure the last row has 2 cells before adding NOTE
    if (data[data.length - 1].length === 1) {
      data[data.length - 1].push(""); // Add empty second cell
    }
    
    // Add one empty row for spacing above the NOTE section
    data.push(["", ""]);
    
    // Add NOTE section at the bottom as a new row - it will span across both columns
    const noteText = "NOTE: This document is managed by Hermes and this header will be overwritten using document metadata.";
    data.push([noteText, ""]); // Always create NOTE row with 2 cells

    return data;
  }

  private getApproverDisplayList(headers: IDocumentMetadata): string[] {
    const groups = (headers.approverGroups || []).filter(Boolean);
    const individualApprovers = (headers.approvers || []).filter(Boolean);
    const approvedBySet = new Set(headers.approvedBy || []);

    const approverDisplay: string[] = [...groups];

    for (const approver of individualApprovers) {
      if (approvedBySet.has(approver)) {
        approverDisplay.push(`✅ ${approver}`);
      } else {
        approverDisplay.push(approver);
      }
    }

    return approverDisplay;
  }

  /**
   * Adds hyperlinks to table cells for projects, Hermes, and document references.
   * 
   * @param ctx - The Word.RequestContext used to interact with the Word document.
   * @param cell - The table cell that may contain linkable content.
   * @param projectDetails - Array of project details with id and title.
   * @param baseUrl - Base URL for creating complete hyperlinks.
   * @param headers - Document metadata containing docId and draft status.
   */
  private async addHyperlinks(
    ctx: Word.RequestContext, 
    cell: Word.TableCell, 
    projectDetails: Array<{id: string, title: string}>,
    baseUrl?: string,
    headers?: IDocumentMetadata
  ): Promise<void> {
    try {
      cell.load("body");
      await ctx.sync();
      
      const cellText = cell.body.text || "";

      // Handle Projects hyperlinks
      if (cellText.includes("Projects:")) {
        await this.handleProjectsHyperlinks(ctx, cell, cellText, projectDetails, baseUrl);
      }
      
      // Handle NOTE section hyperlinks
      else if (cellText.includes("NOTE:")) {
        await this.handleNoteHyperlinks(ctx, cell, baseUrl, headers);
      }
      
    } catch (error) {
      console.log("Error adding hyperlinks:", error);
      console.error("Full error details:", error);
      // Don't throw - hyperlinks are an enhancement, not critical
    }
  }

  /**
   * Handles hyperlinks for project names in Projects cells.
   */
  private async handleProjectsHyperlinks(
    ctx: Word.RequestContext,
    cell: Word.TableCell,
    cellText: string,
    projectDetails: Array<{id: string, title: string}>,
    baseUrl?: string
  ): Promise<void> {
    // Extract the "Projects:" part and the project names part
    const parts = cellText.split(":");
    if (parts.length < 2) {
      return;
    }
    
    const projectNamesText = parts.slice(1).join(":").trim();
    
    if (!projectNamesText || projectNamesText === "N/A") {
      return;
    }
    
    // Build HTML content with hyperlinks
    let htmlContent = `<span style="font-weight: bold; font-size: 9pt; color: ${WordService.FIELD_KEY_COLOR};">Projects: </span>`;
    
    let linkedProjects: string[] = [];
    for (const project of projectDetails) {
      if (projectNamesText.includes(project.title)) {
        const projectUrl = baseUrl ? `${baseUrl}/projects/${project.id}` : `https://example.com/projects/${project.id}`;
        linkedProjects.push(`<a href="${projectUrl}" style="font-size: 9pt;">${project.title}</a>`);
      }
    }
    
    if (linkedProjects.length > 0) {
      htmlContent += linkedProjects.join(', ');
      
      // Clear cell and insert HTML
      cell.body.clear();
      cell.body.insertHtml(htmlContent, "Start");
      
      await ctx.sync();
    }
  }

  /**
   * Handles hyperlinks for NOTE section with Hermes and document links.
   */
  private async handleNoteHyperlinks(
    ctx: Word.RequestContext,
    cell: Word.TableCell,
    baseUrl?: string,
    headers?: IDocumentMetadata
  ): Promise<void> {
    // Build HTML content with hyperlinks for NOTE section
    const hermesUrl = baseUrl || "https://example.com";
    
    // Build document URL based on draft status
    let documentUrl = "#";
    if (baseUrl && headers?.objectID) {
      const isDraft = headers._isDraft || false;
      documentUrl = `${baseUrl}/document/${headers.objectID}`;
      if (isDraft) {
        documentUrl += "?draft=true";
      }
    }
    
    const htmlContent = `<span style="font-weight: bold; font-size: 9.5pt; color: ${WordService.FIELD_KEY_COLOR};">NOTE: </span><span style="font-size: 9.5pt;">This <a href="${documentUrl}" style="font-size: 9.5pt;">document</a> is managed by, <a href="${hermesUrl}" style="font-size: 9.5pt;">Hermes</a> and this header will be overwritten using document metadata.</span>`;
    
    // Clear cell and insert HTML
    cell.body.clear();
    cell.body.insertHtml(htmlContent, "Start");
    
    await ctx.sync();
  }

}
