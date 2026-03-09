package sharepointhelper

import (
	"archive/zip"
	"bytes"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// We'll use direct string manipulation for the core properties XML
// since the XML structure in DOCX files is very particular and requires
// specific namespace handling that's difficult with Go's XML marshaling

// UpdateDocxCoreProperties updates the core properties in a DOCX document
func UpdateDocxCoreProperties(docxPath string, owner string, fileId string, title string) error {
	// Open the DOCX file for reading
	reader, err := zip.OpenReader(docxPath)
	if err != nil {
		return fmt.Errorf("error opening DOCX file: %w", err)
	}
	defer reader.Close()

	// Create a new ZIP file for writing
	tmpFile := docxPath + ".core.tmp"
	outFile, err := os.Create(tmpFile)
	if err != nil {
		return fmt.Errorf("error creating temporary file: %w", err)
	}
	defer func() {
		outFile.Close()
		// Clean up in case of error
		if err != nil {
			os.Remove(tmpFile)
		}
	}()

	// Create a new ZIP writer
	archive := zip.NewWriter(outFile)
	defer archive.Close()

	// Flag to track if we've processed core.xml
	corePropertiesProcessed := false

	// Current time in W3CDTF format (ISO 8601)
	now := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	// Process each file in the original DOCX
	for _, file := range reader.File {
		if strings.EqualFold(file.Name, "docProps/core.xml") {
			// This is the core properties XML - we need to modify it
			corePropertiesProcessed = true

			// Open the core.xml file
			fileReader, err := file.Open()
			if err != nil {
				return fmt.Errorf("error opening core.xml: %w", err)
			}

			// Read the XML content as a string
			contentBytes, err := io.ReadAll(fileReader)
			fileReader.Close()
			if err != nil {
				return fmt.Errorf("error reading core.xml: %w", err)
			}

			xmlContent := string(contentBytes)

			// Create new XML content
			// First, extract existing values from the XML content or use defaults
			creatorValue := owner
			if creatorValue == "" {
				// Try to extract existing creator value
				creatorMatch := regexp.MustCompile(`<dc:creator>([^<]+)</dc:creator>`).FindStringSubmatch(xmlContent)
				if len(creatorMatch) > 1 {
					creatorValue = creatorMatch[1]
				}
			}
			lastModByValue := owner
			if lastModByValue == "" {
				// Try to extract existing lastModifiedBy value
				lastModByMatch := regexp.MustCompile(`<cp:lastModifiedBy>([^<]+)</cp:lastModifiedBy>`).FindStringSubmatch(xmlContent)
				if len(lastModByMatch) > 1 {
					lastModByValue = lastModByMatch[1]
				}
			}
			titleValue := title
			if titleValue == "" {
				// Try to extract existing title value
				titleMatch := regexp.MustCompile(`<dc:title>([^<]+)</dc:title>`).FindStringSubmatch(xmlContent)
				if len(titleMatch) > 1 {
					titleValue = titleMatch[1]
				}
			}
			keywordsValue := ""
			keywordsMatch := regexp.MustCompile(`<cp:keywords>([^<]+)</cp:keywords>`).FindStringSubmatch(xmlContent)
			if len(keywordsMatch) > 1 {
				keywordsValue = keywordsMatch[1]
			}
			// Add fileId to keywords
			if fileId != "" {
				if keywordsValue != "" {
					keywordsValue = keywordsValue + "; FileID: " + fileId
				} else {
					keywordsValue = "FileID: " + fileId
				}
			}
			// Build a properly formatted core.xml
			updatedXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`

			if titleValue != "" {
				updatedXML += fmt.Sprintf("\n  <dc:title>%s</dc:title>", html.EscapeString(titleValue))
			}

			if creatorValue != "" {
				updatedXML += fmt.Sprintf("\n  <dc:creator>%s</dc:creator>", html.EscapeString(creatorValue))
			}

			if lastModByValue != "" {
				updatedXML += fmt.Sprintf("\n  <cp:lastModifiedBy>%s</cp:lastModifiedBy>", html.EscapeString(lastModByValue))
			}

			if keywordsValue != "" {
				updatedXML += fmt.Sprintf("\n  <cp:keywords>%s</cp:keywords>", html.EscapeString(keywordsValue))
			}

			// Add created date
			updatedXML += fmt.Sprintf("\n  <dcterms:created xsi:type=\"dcterms:W3CDTF\">%s</dcterms:created>", now)

			// Add modified date
			updatedXML += fmt.Sprintf("\n  <dcterms:modified xsi:type=\"dcterms:W3CDTF\">%s</dcterms:modified>", now)

			updatedXML += "\n</cp:coreProperties>"

			// Create a new file in the archive
			writer, err := archive.Create(file.Name)
			if err != nil {
				return fmt.Errorf("error creating core.xml in archive: %w", err)
			}

			// Write the modified content
			_, err = writer.Write([]byte(updatedXML))
			if err != nil {
				return fmt.Errorf("error writing modified core.xml: %w", err)
			}
		} else {
			// Copy file directly without modification
			writer, err := archive.Create(file.Name)
			if err != nil {
				return fmt.Errorf("error creating file in archive: %w", err)
			}

			reader, err := file.Open()
			if err != nil {
				return fmt.Errorf("error opening file from original archive: %w", err)
			}

			_, err = io.Copy(writer, reader)
			reader.Close()
			if err != nil {
				return fmt.Errorf("error copying file to new archive: %w", err)
			}
		}
	}

	// If we didn't find the core.xml file, create it
	if !corePropertiesProcessed {
		// Create a new core properties file
		// Build a properly formatted core.xml
		updatedXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`

		if title != "" {
			updatedXML += fmt.Sprintf("\n  <dc:title>%s</dc:title>", html.EscapeString(title))
		}
		if owner != "" {
			updatedXML += fmt.Sprintf("\n  <dc:creator>%s</dc:creator>", html.EscapeString(owner))
			updatedXML += fmt.Sprintf("\n  <cp:lastModifiedBy>%s</cp:lastModifiedBy>", html.EscapeString(owner))
		}

		if fileId != "" {
			updatedXML += fmt.Sprintf("\n  <cp:keywords>FileID: %s</cp:keywords>", html.EscapeString(fileId))
		}

		// Add created date
		updatedXML += fmt.Sprintf("\n  <dcterms:created xsi:type=\"dcterms:W3CDTF\">%s</dcterms:created>", now)

		// Add modified date
		updatedXML += fmt.Sprintf("\n  <dcterms:modified xsi:type=\"dcterms:W3CDTF\">%s</dcterms:modified>", now)

		updatedXML += "\n</cp:coreProperties>"

		// Create a new file in the archive
		writer, err := archive.Create("docProps/core.xml")
		if err != nil {
			return fmt.Errorf("error creating core.xml in archive: %w", err)
		}

		// Write the modified content
		_, err = writer.Write([]byte(updatedXML))
		if err != nil {
			return fmt.Errorf("error writing modified core.xml: %w", err)
		}
	}

	// Close the zip writer before renaming files
	if err := archive.Close(); err != nil {
		return fmt.Errorf("error closing zip archive: %w", err)
	}

	// Close the output file
	if err := outFile.Close(); err != nil {
		return fmt.Errorf("error closing output file: %w", err)
	}

	// Replace the original file with the modified one
	if err := os.Rename(tmpFile, docxPath); err != nil {
		return fmt.Errorf("error replacing original file: %w", err)
	}

	return nil
}

// UpdateDocxHeaderTable updates a DOCX document to include a properly formatted header table
// with the provided properties. This replaces or adds a table at the beginning of the document.
func UpdateDocxHeaderTable(docxPath string, properties map[string]string) error {
	// Open the DOCX file for reading
	reader, err := zip.OpenReader(docxPath)
	if err != nil {
		return fmt.Errorf("error opening DOCX file: %w", err)
	}
	defer reader.Close()

	// Create a new ZIP file for writing
	tmpFile := docxPath + ".tmp"
	outFile, err := os.Create(tmpFile)
	if err != nil {
		return fmt.Errorf("error creating temporary file: %w", err)
	}
	defer func() {
		outFile.Close()
		// Clean up in case of error
		if err != nil {
			os.Remove(tmpFile)
		}
	}()

	// Create a new ZIP writer
	archive := zip.NewWriter(outFile)
	defer archive.Close()

	// Flag to track if we've processed document.xml
	documentProcessed := false

	// Process each file in the original DOCX
	for _, file := range reader.File {
		if strings.EqualFold(file.Name, "word/document.xml") {
			// This is the main document XML - we need to modify it
			documentProcessed = true

			// Open the document.xml file
			fileReader, err := file.Open()
			if err != nil {
				return fmt.Errorf("error opening document.xml: %w", err)
			}

			// Read the XML content
			xmlContent, err := io.ReadAll(fileReader)
			if err != nil {
				fileReader.Close()
				return fmt.Errorf("error reading document.xml: %w", err)
			}
			fileReader.Close()

			// Create the new header table XML
			headerTable := generateHeaderTableXML(properties)

			// Find where to insert the header table
			modifiedXML, err := insertHeaderTableIntoDocument(xmlContent, headerTable)
			if err != nil {
				return fmt.Errorf("error inserting header table into document: %w", err)
			}

			// Create a new file in the archive
			writer, err := archive.Create(file.Name)
			if err != nil {
				return fmt.Errorf("error creating document.xml in archive: %w", err)
			}

			// Write the modified content
			_, err = writer.Write(modifiedXML)
			if err != nil {
				return fmt.Errorf("error writing modified document.xml: %w", err)
			}
		} else if strings.EqualFold(file.Name, "docProps/core.xml") {
			// Skip copying core.xml - it will be updated by UpdateDocxCoreProperties
			// If we copy it here, we'll preserve any empty/minimal properties from the template
			continue
		} else {
			// Copy file directly without modification
			writer, err := archive.Create(file.Name)
			if err != nil {
				return fmt.Errorf("error creating file in archive: %w", err)
			}

			reader, err := file.Open()
			if err != nil {
				return fmt.Errorf("error opening file from original archive: %w", err)
			}

			_, err = io.Copy(writer, reader)
			reader.Close()
			if err != nil {
				return fmt.Errorf("error copying file to new archive: %w", err)
			}
		}
	}

	// Ensure we processed the document.xml file
	if !documentProcessed {
		return fmt.Errorf("document.xml not found in DOCX file")
	}

	// Close the zip writer before renaming files
	if err := archive.Close(); err != nil {
		return fmt.Errorf("error closing zip archive: %w", err)
	}

	// Close the output file
	if err := outFile.Close(); err != nil {
		return fmt.Errorf("error closing output file: %w", err)
	}

	// Replace the original file with the modified one
	if err := os.Rename(tmpFile, docxPath); err != nil {
		return fmt.Errorf("error replacing original file: %w", err)
	}

	return nil
}

// insertHeaderTableIntoDocument inserts the header table XML at the beginning of the document body
// or replaces an existing header table if one is found
func insertHeaderTableIntoDocument(docXML []byte, tableXML string) ([]byte, error) {
	// Convert to string for easier manipulation
	docContent := string(docXML)

	// Find the body tag
	bodyStartRegex := regexp.MustCompile(`<w:body[^>]*>`)
	bodyStartMatch := bodyStartRegex.FindStringIndex(docContent)
	if bodyStartMatch == nil {
		return nil, fmt.Errorf("could not find document body in XML")
	}

	// Find position after the body tag
	insertPos := bodyStartMatch[1]

	// Check if there's already a table at the beginning of the document
	// Look for the opening table tag after the body tag
	tableStartRegex := regexp.MustCompile(`<w:tbl\b`)
	firstParaRegex := regexp.MustCompile(`<w:p\b`) // Also look for paragraphs to find what comes first

	// Search for the first table and paragraph after the body tag
	tableMatch := tableStartRegex.FindStringIndex(docContent[insertPos:])
	paraMatch := firstParaRegex.FindStringIndex(docContent[insertPos:])

	// Determine if we need to replace an existing table or add a new one
	var newContent string

	if tableMatch != nil {
		// Found a table - now check if it's the first element (before any paragraph)
		// or if there's no paragraph before it
		isFirstElement := (paraMatch == nil) || (tableMatch[0] < paraMatch[0])

		if isFirstElement {
			// This appears to be a header table we should replace
			// Find the end of this table
			tableEndRegex := regexp.MustCompile(`</w:tbl>`)
			tableEndMatch := tableEndRegex.FindStringIndex(docContent[insertPos+tableMatch[0]:])

			if tableEndMatch != nil {
				// Calculate positions in the full document string
				tableStartPos := insertPos + tableMatch[0]
				tableEndPos := insertPos + tableMatch[0] + tableEndMatch[1]

				// Replace the existing table with our new one
				newContent = docContent[:tableStartPos] + tableXML + docContent[tableEndPos:]
				return []byte(newContent), nil
			}
		}
	}

	// If we get here, either no table was found or the table wasn't at the beginning
	// Insert our table at the beginning of the body
	newContent = docContent[:insertPos] + tableXML + docContent[insertPos:]
	return []byte(newContent), nil
}

// getProperty safely gets a property value with a default if not present
func getProperty(properties map[string]string, key string, defaultValue string) string {
	if value, exists := properties[key]; exists && value != "" {
		return value
	}
	return defaultValue
}

// xmlEscape escapes special characters for XML
func xmlEscape(s string) string {
	var b strings.Builder
	xml.EscapeText(&b, []byte(s))
	return b.String()
}

// generateStatusXML creates the XML for status values, with the current status in bold
// and other statuses in normal text. Takes the formatted status string that includes current status data.
func generateStatusXML(formattedStatus string) string {
	var result strings.Builder

	// Extract current status from formatted string
	parts := strings.Split(formattedStatus, "|")
	if len(parts) < 1 {
		return ""
	}

	currentStatus := parts[0]

	// The standard statuses
	allStatuses := []string{"WIP", "In-Review", "Approved", "Obsolete"}

	// Add each status with appropriate formatting
	for i, status := range allStatuses {
		if i > 0 {
			// Add separator between status values with explicit spacing
			result.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> | </w:t>
        </w:r>`)
		}

		if strings.EqualFold(status, currentStatus) {
			// Current status - use bold
			result.WriteString(`
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>`)
			result.WriteString(status)
			result.WriteString(`</w:t>
        </w:r>`)
		} else {
			// Not current status - use normal text
			result.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>`)
			result.WriteString(status)
			result.WriteString(`</w:t>
        </w:r>`)
		}
	}

	return result.String()
}

// generateTableRow creates a table row with two columns, properly handling status fields
func generateTableRow(leftKey, leftValue, rightKey, rightValue string, leftIsStatus, rightIsStatus bool) string {
	var rowXML strings.Builder

	rowXML.WriteString(`
  <w:tr>
    <w:tc>
      <w:p>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>`)

	// Add left column key and colon (with proper spacing)
	rowXML.WriteString(fmt.Sprintf("%s: ", leftKey))
	rowXML.WriteString(`</w:t>
        </w:r>`)

	if leftIsStatus {
		// Add explicit space before the status values
		rowXML.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> </w:t>
        </w:r>`)

		// Special handling for Status in left column
		rowXML.WriteString(generateStatusXML(leftValue))
	} else {
		// Normal value for left column - explicitly add a space as a separate run before the value
		rowXML.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> </w:t>
        </w:r>`)

		rowXML.WriteString(fmt.Sprintf(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>%s</w:t>
        </w:r>`, leftValue))
	}

	rowXML.WriteString(`
      </w:p>
    </w:tc>
    <w:tc>
      <w:p>`)

	// Only add right column content if there is a right key
	if rightKey != "" {
		rowXML.WriteString(fmt.Sprintf(`
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>%s: </w:t>
        </w:r>`, rightKey))

		if rightIsStatus {
			// Add explicit space before the status values
			rowXML.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> </w:t>
        </w:r>`)

			// Special handling for Status in right column
			rowXML.WriteString(generateStatusXML(rightValue))
		} else {
			// Normal value for right column - explicitly add a space as a separate run before the value
			rowXML.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> </w:t>
        </w:r>`)

			rowXML.WriteString(fmt.Sprintf(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>%s</w:t>
        </w:r>`, rightValue))
		}
	} else {
		// Empty right column
		rowXML.WriteString(`
        <w:r>
          <w:rPr>
            <w:sz w:val="20"/>
            <w:szCs w:val="20"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t></w:t>
        </w:r>`)
	}

	rowXML.WriteString(`
      </w:p>
    </w:tc>
  </w:tr>`)

	return rowXML.String()
}

// generateHeaderTableXML creates a Word table XML structure with property information
func generateHeaderTableXML(properties map[string]string) string {
	// Extract special properties with defaults for title and summary handling
	docType := getProperty(properties, "DocType", "")
	docNumber := getProperty(properties, "DocNumber", "")
	title := getProperty(properties, "Title", "")
	summary := getProperty(properties, "Summary", "")

	// Format the title with document type and number if available
	titleWithTypeAndNumber := title
	if docType != "" && docNumber != "" {
		titleWithTypeAndNumber = fmt.Sprintf("[%s] [%s]: %s", docType, docNumber, title)
	} else if docNumber != "" {
		titleWithTypeAndNumber = fmt.Sprintf("[%s] %s", docNumber, title)
	}

	// XML escape title and summary values
	titleWithTypeAndNumber = xmlEscape(titleWithTypeAndNumber)
	summary = xmlEscape(summary)

	// Create a map to hold all other properties that will be displayed in the table
	// Skip properties that are already handled specially (Title, DocNumber, Summary, DocType)
	tableAttributes := make(map[string]string)

	// Standard attribute display names
	displayNames := map[string]string{
		"DocType":      "Document Type",
		"Product":      "Product",
		"Creator":      "Author",
		"CreatedDate":  "Created",
		"Status":       "Status",
		"Contributors": "Contributors",
		"Approvers":    "Approvers",
		"Owner":        "Owner",
		// Add any other standard mappings here
	}

	// Track the mandatory fields we've processed
	processedMandatoryFields := make(map[string]bool)
	processedMandatoryFields["Title"] = true
	processedMandatoryFields["Summary"] = true
	processedMandatoryFields["DocNumber"] = true
	processedMandatoryFields["DocType"] = true

	// Copy all properties to tableAttributes with proper display names
	for key, value := range properties {
		// Skip special properties that are already handled
		if key == "Title" || key == "DocNumber" || key == "Summary" || key == "DocType" {
			continue
		}

		// Get display name, or use the key with first letter capitalized if not found
		displayName, exists := displayNames[key]
		if !exists {
			// Convert camelCase or snake_case to proper case
			displayName = strings.ReplaceAll(key, "_", " ")

			// Capitalize first letter of each word
			words := strings.Fields(displayName)
			for i, word := range words {
				if len(word) > 0 {
					words[i] = strings.ToUpper(word[0:1]) + word[1:]
				}
			}
			displayName = strings.Join(words, " ")
		}

		// Special handling for Status field - show all possible statuses with only the current one in bold
		if key == "Status" {
			// The standard statuses
			allStatuses := []string{"WIP", "In-Review", "Approved", "Obsolete"}

			// Create a map to store which status is current
			statusMap := make(map[string]bool)
			for _, status := range allStatuses {
				statusMap[status] = strings.EqualFold(status, value)
			}

			// Store the formatted status data as JSON encoded string that can be parsed in the XML generation
			formattedStatus := fmt.Sprintf("%s|%v", xmlEscape(value), statusMap)
			tableAttributes[displayName] = formattedStatus
			processedMandatoryFields[key] = true
			continue
		}

		// Add to table attributes map with XML escaped value
		tableAttributes[displayName] = xmlEscape(value)
		processedMandatoryFields[key] = true
	}

	// Build the table XML - using Aptos font styling with minimal borders
	tableXML := `
<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="9576" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="6" w:space="0" w:color="000000"/>
      <w:left w:val="nil"/>
      <w:bottom w:val="single" w:sz="6" w:space="0" w:color="000000"/>
      <w:right w:val="nil"/>
      <w:insideH w:val="nil"/>
      <w:insideV w:val="nil"/>
    </w:tblBorders>
    <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="4788"/>
    <w:gridCol w:w="4788"/>
  </w:tblGrid>`

	// Add the title row that spans the entire width (first row) - using Aptos Display font
	tableXML += fmt.Sprintf(`
  <w:tr>
    <w:tc>
      <w:tcPr>
        <w:gridSpan w:val="2"/>
        <w:tcMar>
          <w:top w:w="55" w:type="dxa"/>
          <w:bottom w:w="55" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:jc w:val="left"/>
          <w:spacing w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:color w:val="0F4761"/>
            <w:sz w:val="40"/>
            <w:szCs w:val="40"/>
            <w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/>
          </w:rPr>
          <w:t>%s</w:t>
        </w:r>
      </w:p>
    </w:tc>
  </w:tr>`, titleWithTypeAndNumber)

	// Add summary row that spans the entire width if present (second row)
	if summary != "" {
		tableXML += fmt.Sprintf(`
  <w:tr>
    <w:tc>
      <w:tcPr>
        <w:gridSpan w:val="2"/>
        <w:tcMar>
          <w:top w:w="55" w:type="dxa"/>
          <w:bottom w:w="55" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p>
        <w:pPr>
          <w:spacing w:after="120"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:b/>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>Summary: </w:t>
        </w:r>
        <w:r>
          <w:rPr>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t xml:space="preserve"> </w:t>
        </w:r>
        <w:r>
          <w:rPr>
            <w:sz w:val="24"/>
            <w:szCs w:val="24"/>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
          </w:rPr>
          <w:t>%s</w:t>
        </w:r>
      </w:p>
    </w:tc>
  </w:tr>`, summary)
	}

	// Create ordered list of mandatory fields to display first in the specified order
	orderedMandatoryPairs := [][]string{
		{"Created", "Status"},
		{"Product", "Owner"},
		{"Contributors", "Approvers"},
	}

	// First, add the mandatory fields in the specified order
	for _, pair := range orderedMandatoryPairs {
		leftKey := pair[0]
		rightKey := pair[1]

		leftDisplayName, leftExists := displayNames[leftKey]
		if !leftExists {
			leftDisplayName = leftKey
		}

		rightDisplayName, rightExists := displayNames[rightKey]
		if !rightExists {
			rightDisplayName = rightKey
		}

		leftValue, leftFound := tableAttributes[leftDisplayName]
		rightValue, rightFound := tableAttributes[rightDisplayName]

		// If at least one of the fields exists, create a row
		if leftFound || rightFound {
			leftValueToUse := leftValue
			if !leftFound {
				leftValueToUse = ""
			}

			rightValueToUse := rightValue
			if !rightFound {
				rightValueToUse = ""
			}

			// Special handling for Status field
			leftIsStatus := leftDisplayName == "Status"
			rightIsStatus := rightDisplayName == "Status"

			// Add the row to the table
			tableXML += generateTableRow(leftDisplayName, leftValueToUse, rightDisplayName, rightValueToUse, leftIsStatus, rightIsStatus)

			// Mark these fields as processed
			delete(tableAttributes, leftDisplayName)
			delete(tableAttributes, rightDisplayName)
		}
	}

	// Then, add any remaining fields
	var remainingKeys []string
	for key := range tableAttributes {
		remainingKeys = append(remainingKeys, key)
	}

	// Sort the remaining keys for consistent output
	sort.Strings(remainingKeys)

	// Process remaining attributes in pairs (two columns per row)
	for i := 0; i < len(remainingKeys); i += 2 {
		leftKey := remainingKeys[i]
		leftValue := tableAttributes[leftKey]

		// Check if we have a right column
		hasRightColumn := (i + 1) < len(remainingKeys)
		rightKey := ""
		rightValue := ""
		if hasRightColumn {
			rightKey = remainingKeys[i+1]
			rightValue = tableAttributes[rightKey]
		}

		// Special handling for Status field
		leftIsStatus := leftKey == "Status"
		rightIsStatus := hasRightColumn && rightKey == "Status"

		// Add the row to the table
		if hasRightColumn {
			tableXML += generateTableRow(leftKey, leftValue, rightKey, rightValue, leftIsStatus, rightIsStatus)
		} else {
			// Last row with only one attribute
			tableXML += generateTableRow(leftKey, leftValue, "", "", leftIsStatus, false)
		}
	}

	// Close the table
	tableXML += `
</w:tbl>
<w:p/>
`
	return tableXML
}

// ReplaceDocumentHeaderWithContentUpdate updates the document header table
// by downloading the document, modifying its content to include a properly formatted
// header table with the given properties, and uploading it back to SharePoint.
func (s *Service) ReplaceDocumentHeaderWithContentUpdate(fileID string, properties map[string]string) error {
	if s.Logger != nil {
		s.Logger.Info("Starting document header update with content modification",
			"file_id", fileID)
	}

	// Get file details first to get the file name and extension
	fileDetails, err := s.GetFileDetails(fileID)
	if err != nil {
		return fmt.Errorf("error getting file details: %w", err)
	}

	// Check if this is a DOCX file
	if !strings.HasSuffix(strings.ToLower(fileDetails.Name), ".docx") {
		return fmt.Errorf("file is not a DOCX document: %s", fileDetails.FileExtension)
	}

	// Create a temporary directory for processing
	tempDir, err := os.MkdirTemp("", "sharepoint_doc")
	if err != nil {
		return fmt.Errorf("error creating temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	if s.Logger != nil {
		s.Logger.Debug("Processing document",
			"temp_dir", tempDir,
			"file_name", fileDetails.Name)
	}

	// Download the file to the temporary directory
	tempFilePath := filepath.Join(tempDir, fileDetails.Name)

	if err := s.downloadFile(fileID, tempFilePath); err != nil {
		return fmt.Errorf("error downloading document: %w", err)
	}

	if s.Logger != nil {
		s.Logger.Debug("Document downloaded successfully")
	}

	// Verify file exists and has content
	fileInfo, err := os.Stat(tempFilePath)
	if err != nil {
		return fmt.Errorf("error checking downloaded file: %w", err)
	}
	if fileInfo.Size() == 0 {
		return fmt.Errorf("downloaded file is empty")
	}

	// Update the document header table
	if err := UpdateDocxHeaderTable(tempFilePath, properties); err != nil {
		return fmt.Errorf("error updating document header table: %w", err)
	}

	// Get the title and owner from the properties
	title := getProperty(properties, "Title", "")
	owner := getProperty(properties, "Owner", "")

	// Update the document core properties with owner and fileID
	if err := UpdateDocxCoreProperties(tempFilePath, owner, fileID, title); err != nil {
		return fmt.Errorf("error updating document core properties: %w", err)
	}

	// Check file size after update
	fileInfo, err = os.Stat(tempFilePath)
	if err != nil {
		return fmt.Errorf("error checking updated file: %w", err)
	}

	if s.Logger != nil {
		s.Logger.Debug("Document updates completed successfully",
			"updated_file_size", fileInfo.Size())
	}

	// Upload the modified file back to SharePoint
	if err := s.uploadModifiedFile(tempFilePath, fileID); err != nil {
		return fmt.Errorf("error uploading modified document: %w", err)
	}

	if s.Logger != nil {
		s.Logger.Info("Document updates completed successfully")
	}

	return nil
}

// downloadFile downloads a file from SharePoint by its ID to the specified local path.
func (s *Service) downloadFile(fileID string, localPath string) error {
	// Construct the Microsoft Graph API URL for file content
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content", s.SiteID, s.DriveID, fileID)

	// Make the authenticated request
	resp, err := s.InvokeAPI("GET", url, nil)
	if err != nil {
		return fmt.Errorf("error making request to SharePoint: %w", err)
	}
	defer resp.Body.Close()

	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to download content: %s, %s", resp.Status, string(body))
	}

	// Create output file
	out, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("error creating local file: %w", err)
	}
	defer out.Close()

	// Copy binary data directly from response body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("error writing file content: %w", err)
	}

	return nil
}

// uploadModifiedFile uploads a file from a local path to SharePoint, replacing an existing file.
func (s *Service) uploadModifiedFile(localPath, fileID string) error {
	// Read the file content
	content, err := os.ReadFile(localPath)
	if err != nil {
		return fmt.Errorf("error reading local file: %w", err)
	}

	// Construct the Microsoft Graph API URL for uploading content to an existing file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content",
		s.SiteID, s.DriveID, fileID)

	// Upload the file content
	resp, err := s.InvokeAPI("PUT", url, bytes.NewReader(content))
	if err != nil {
		return fmt.Errorf("error uploading file: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("error uploading file: %s, %s", resp.Status, string(body))
	}

	return nil
}
