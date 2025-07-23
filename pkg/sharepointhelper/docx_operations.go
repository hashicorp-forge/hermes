package sharepointhelper

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// DocxProperty represents a document property in a DOCX file
type DocxProperty struct {
	Name  string `xml:"name,attr"`
	Value string `xml:",chardata"`
}

// DocxProperties represents the properties XML element in a DOCX file
type DocxProperties struct {
	XMLName    xml.Name       `xml:"properties"`
	Properties []DocxProperty `xml:"property"`
}

// DownloadFile downloads a file from SharePoint
func (s *Service) DownloadFile(fileID string, targetPath string) error {
	fmt.Printf("Starting download of file ID: %s to path: %s\n", fileID, targetPath)
	
	// Construct the Microsoft Graph API URL for downloading a file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content", 
		s.SiteID, s.DriveID, fileID)
	
	fmt.Printf("Download URL: %s\n", url)
	
	// Create the HTTP request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("error creating download request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	
	// Set a longer timeout for the client to handle larger files
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}
	
	// Execute the request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error downloading file: %w", err)
	}
	defer resp.Body.Close()
	
	// Check for a successful response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to download file: status=%s, body=%s", resp.Status, string(body))
	}
	
	fmt.Printf("Download request successful. Content-Length: %s\n", resp.Header.Get("Content-Length"))
	
	// Create parent directories if they don't exist
	dir := filepath.Dir(targetPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("error creating parent directories: %w", err)
	}
	
	// Create the target file
	out, err := os.Create(targetPath)
	if err != nil {
		return fmt.Errorf("error creating file: %w", err)
	}
	defer out.Close()
	
	// Copy the response body to the target file with progress tracking
	written, err := io.Copy(out, resp.Body)
	if err != nil {
		return fmt.Errorf("error saving file: %w", err)
	}
	
	fmt.Printf("Successfully downloaded file. Bytes written: %d\n", written)
	
	// Verify the file was written correctly
	if written == 0 {
		return fmt.Errorf("downloaded file is empty (0 bytes)")
	}
	
	// Sync to ensure data is written to disk
	if err = out.Sync(); err != nil {
		return fmt.Errorf("error syncing file: %w", err)
	}
	
	return nil
}

// UploadFile uploads a file to SharePoint
func (s *Service) UploadFile(filePath string, fileID string) error {
	fmt.Printf("Starting upload of file: %s to SharePoint ID: %s\n", filePath, fileID)
	
	// Check if file exists
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		return fmt.Errorf("error checking file: %w", err)
	}
	
	fileSize := fileInfo.Size()
	fmt.Printf("File size to upload: %d bytes\n", fileSize)
	
	if fileSize == 0 {
		return fmt.Errorf("cannot upload empty file")
	}
	
	// Open the file
	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("error opening file for upload: %w", err)
	}
	defer file.Close()
	
	// Read the file content
	fileContent, err := io.ReadAll(file)
	if err != nil {
		return fmt.Errorf("error reading file content: %w", err)
	}
	
	fmt.Printf("File read successfully. Content length: %d bytes\n", len(fileContent))
	
	// Construct the Microsoft Graph API URL for uploading a file
	url := fmt.Sprintf("https://graph.microsoft.com/v1.0/sites/%s/drives/%s/items/%s/content", 
		s.SiteID, s.DriveID, fileID)
	
	fmt.Printf("Upload URL: %s\n", url)
	
	// Create the HTTP request
	req, err := http.NewRequest("PUT", url, bytes.NewReader(fileContent))
	if err != nil {
		return fmt.Errorf("error creating upload request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.AccessToken)
	req.Header.Set("Content-Type", "application/octet-stream")
	req.Header.Set("Content-Length", fmt.Sprintf("%d", len(fileContent)))
	
	// Set a longer timeout for the client to handle larger files
	client := &http.Client{
		Timeout: 5 * time.Minute,
	}
	
	// Execute the request
	fmt.Printf("Sending upload request...\n")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error uploading file: %w", err)
	}
	defer resp.Body.Close()
	
	// Check for a successful response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to upload file: status=%s, body=%s", resp.Status, string(body))
	}
	
	fmt.Printf("File uploaded successfully. Response status: %s\n", resp.Status)
	
	// Parse the response to get updated file details
	var fileResponse struct {
		ID           string `json:"id"`
		Name         string `json:"name"`
		LastModified string `json:"lastModifiedDateTime"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&fileResponse); err != nil {
		fmt.Printf("Warning: couldn't parse upload response: %v\n", err)
	} else {
		fmt.Printf("Updated file details - ID: %s, Name: %s, Last Modified: %s\n", 
			fileResponse.ID, fileResponse.Name, fileResponse.LastModified)
	}
	
	return nil
}

// UpdateDocxDocumentContent updates only the document.xml content without creating headers
func UpdateDocxDocumentContent(docxPath string, properties map[string]string) error {
	fmt.Printf("Updating DOCX document content at: %s\n", docxPath)
	
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
	defer outFile.Close()
	
	// Create a new ZIP writer
	archive := zip.NewWriter(outFile)
	defer archive.Close()
	
	// Track which files we've modified
	modifiedFiles := make(map[string]bool)
	
	// Property files to update (only core properties, no headers)
	propertyFiles := []string{
		"docProps/core.xml",
		"docProps/app.xml",
		"docProps/custom.xml",
	}
	
	// Process each file in the original DOCX
	for _, file := range reader.File {
		shouldModify := false
		isDocumentXml := false
		
		// Check if this is document.xml - we'll add content here
		if strings.EqualFold(file.Name, "word/document.xml") {
			isDocumentXml = true
			shouldModify = true
			modifiedFiles[file.Name] = true
		}
		
		// Check if this is a property file we need to update
		for _, propFile := range propertyFiles {
			if strings.EqualFold(file.Name, propFile) {
				shouldModify = true
				modifiedFiles[propFile] = true
				break
			}
		}
		
		// Read the file content
		fileReader, err := file.Open()
		if err != nil {
			return fmt.Errorf("error opening file %s: %w", file.Name, err)
		}
		
		content, err := io.ReadAll(fileReader)
		fileReader.Close()
		if err != nil {
			return fmt.Errorf("error reading file %s: %w", file.Name, err)
		}
		
		if shouldModify {
			fmt.Printf("Modifying file: %s\n", file.Name)
			
			// If this is document.xml, add property information to the document content
			if isDocumentXml {
				fmt.Printf("Adding property information to document.xml\n")
				
				docContent := string(content)
				
				// Find the body content and add our property information
				bodyEndPos := strings.LastIndex(docContent, "</w:body>")
				if bodyEndPos > 0 {
					// Create a simple paragraph with the properties
					propertiesText := "\n"
					for key, value := range properties {
						if value != "" {
							propertiesText += fmt.Sprintf("%s: %s\n", key, value)
						}
					}
					
					// Add a paragraph with the properties at the end of the document
					propertyParagraph := fmt.Sprintf(`
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
        <w:spacing w:before="480" w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>Document Properties</w:t>
      </w:r>
    </w:p>`)
					
					for key, value := range properties {
						if value != "" {
							propertyParagraph += fmt.Sprintf(`
    <w:p>
      <w:r>
        <w:rPr>
          <w:b/>
        </w:rPr>
        <w:t>%s: </w:t>
      </w:r>
      <w:r>
        <w:t>%s</w:t>
      </w:r>
    </w:p>`, key, value)
						}
					}
					
					// Insert before the end of body
					docContent = docContent[:bodyEndPos] + propertyParagraph + docContent[bodyEndPos:]
					content = []byte(docContent)
					fmt.Printf("Added property information to document content\n")
				}
			}
			
			// Modify the XML content to update properties (for property files)
			if !isDocumentXml {
				newContent, err := updateXMLProperties(content, properties)
				if err != nil {
					fmt.Printf("Warning: error updating XML properties in %s: %v\n", file.Name, err)
					// Continue with original content if update fails
				} else {
					content = newContent
				}
			}
		}
		
		// Add the file (original or modified) to the new archive
		fileWriter, err := archive.Create(file.Name)
		if err != nil {
			return fmt.Errorf("error creating file in new archive: %w", err)
		}
		
		_, err = fileWriter.Write(content)
		if err != nil {
			return fmt.Errorf("error writing file content: %w", err)
		}
	}
	
	// Close the archive
	if err := archive.Close(); err != nil {
		return fmt.Errorf("error closing archive: %w", err)
	}
	
	// Close the output file
	if err := outFile.Close(); err != nil {
		return fmt.Errorf("error closing output file: %w", err)
	}
	
	// Replace the original file with the updated one
	if err := os.Rename(tmpFile, docxPath); err != nil {
		return fmt.Errorf("error replacing original file: %w", err)
	}
	
	fmt.Printf("Successfully updated DOCX document content\n")
	return nil
}
func UpdateDocxDocumentProperties(docxPath string, properties map[string]string) error {
	fmt.Printf("Updating DOCX document properties in file: %s\n", docxPath)
	
	// Create a temporary directory for our work
	tempDir, err := os.MkdirTemp("", "docx_update")
	if err != nil {
		return fmt.Errorf("error creating temp directory: %w", err)
	}
	defer func() {
		if err := os.RemoveAll(tempDir); err != nil {
			fmt.Printf("Warning: failed to clean up temp directory: %v\n", err)
		}
	}()

	fmt.Printf("Created temp directory: %s\n", tempDir)

	// Open the docx file as a zip archive
	reader, err := zip.OpenReader(docxPath)
	if err != nil {
		return fmt.Errorf("error opening docx file: %w", err)
	}
	defer reader.Close()

	fmt.Printf("Successfully opened DOCX file as ZIP archive\n")

	// List of files to check for property updates
	propertyFiles := []string{
		"docProps/core.xml",      // Core document properties
		"docProps/custom.xml",    // Custom document properties
		"docProps/app.xml",       // Application-specific properties
		"word/settings.xml",      // Word settings that may contain properties
		"word/document.xml",      // Main document content
		"word/header1.xml",       // First header
		"word/header2.xml",       // Second header
		"word/header3.xml",       // Third header
		"word/footer1.xml",       // First footer
		"word/footer2.xml",       // Second footer
		"word/footer3.xml",       // Third footer
	}
	
	// Create a map to track whether we found and modified each property file
	modifiedFiles := make(map[string]bool)
	for _, file := range propertyFiles {
		modifiedFiles[file] = false
	}

	// Create a new zip file for the modified content
	tempFilePath := filepath.Join(tempDir, "temp.docx")
	zipWriter, err := os.Create(tempFilePath)
	if err != nil {
		return fmt.Errorf("error creating temp file: %w", err)
	}
	defer zipWriter.Close()

	archive := zip.NewWriter(zipWriter)
	defer archive.Close()

		// Process each file in the zip archive
	for _, file := range reader.File {
		fmt.Printf("Processing file in archive: %s\n", file.Name)
		
		// Open the file from the archive
		fileReader, err := file.Open()
		if err != nil {
			return fmt.Errorf("error opening file in archive: %w", err)
		}

		// Read the file content
		content, err := io.ReadAll(fileReader)
		fileReader.Close()
		if err != nil {
			return fmt.Errorf("error reading file content: %w", err)
		}

		// Check if this is a file we need to modify
		shouldModify := false
		isDocumentXml := false
		
		// Special handling for document.xml to ensure it references headers
		if strings.EqualFold(file.Name, "word/document.xml") {
			isDocumentXml = true
			shouldModify = true
			modifiedFiles[file.Name] = true
		}
		
		// Check if this is a property file we need to update
		for _, propFile := range propertyFiles {
			if strings.EqualFold(file.Name, propFile) {
				shouldModify = true
				modifiedFiles[propFile] = true
				break
			}
		}

		if shouldModify {
			fmt.Printf("Modifying file: %s\n", file.Name)
			
			// If this is document.xml, ensure it has section properties that reference headers
			if isDocumentXml {
				fmt.Printf("Ensuring document.xml references headers\n")
				
				// Check if document.xml already has a header reference
				hasHeaderRef := strings.Contains(string(content), "w:headerReference")
				docContent := string(content)
				
				// Ensure all required namespaces are present
				if !strings.Contains(docContent, `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"`) {
					fmt.Printf("Adding missing relationship namespace to document.xml\n")
					// Find the document element opening
					docTagEnd := strings.Index(docContent, ">")
					if docTagEnd > 0 && strings.Contains(docContent[:docTagEnd], "<w:document") {
						// Add the namespace before the closing '>'
						docContent = docContent[:docTagEnd] + ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"` + docContent[docTagEnd:]
					}
				}
				
				// Add other important namespaces if missing
				if !strings.Contains(docContent, `xmlns:v="urn:schemas-microsoft-com:vml"`) {
					fmt.Printf("Adding VML namespace to document.xml\n")
					docTagEnd := strings.Index(docContent, ">")
					if docTagEnd > 0 && strings.Contains(docContent[:docTagEnd], "<w:document") {
						// Add the namespace before the closing '>'
						docContent = docContent[:docTagEnd] + ` xmlns:v="urn:schemas-microsoft-com:vml"` + docContent[docTagEnd:]
					}
				}
				
				if !hasHeaderRef {
					// We need to add a header reference to the section properties
					
					// Use consistent relationship ID that matches what we use in the rels file
					const headerRelId = "rId9"
					
					// Find the section properties
					sectPrPos := strings.LastIndex(docContent, "<w:sectPr")
					if sectPrPos >= 0 {
						// Found section properties, insert header reference
						sectPrEndPos := strings.Index(docContent[sectPrPos:], "</w:sectPr>")
						if sectPrEndPos >= 0 {
							sectPrEndPos += sectPrPos
							
							// Insert header reference right before the closing sectPr tag
							headerRef := fmt.Sprintf(`<w:headerReference w:type="default" r:id="%s"/>`, headerRelId)
							docContent = docContent[:sectPrEndPos] + headerRef + docContent[sectPrEndPos:]
							content = []byte(docContent)
							fmt.Printf("Added header reference to existing section properties in document.xml\n")
						}
					} else {
						// No section properties found, look for body end
						bodyEndPos := strings.LastIndex(docContent, "</w:body>")
						if bodyEndPos >= 0 {
							// Insert section properties with header reference before body end
							sectPr := fmt.Sprintf(`<w:sectPr>
    <w:headerReference w:type="default" r:id="%s"/>
    <w:pgSz w:w="12240" w:h="15840"/>
    <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    <w:cols w:space="720"/>
    <w:docGrid w:linePitch="360"/>
</w:sectPr>`, headerRelId)
							docContent = docContent[:bodyEndPos] + sectPr + docContent[bodyEndPos:]
							content = []byte(docContent)
							fmt.Printf("Added new section properties with header reference to document.xml\n")
						} else {
							// Document appears to be invalid - missing body end tag
							// Let's try to fix by ensuring proper document structure
							fmt.Printf("Document missing proper body structure, attempting repair\n")
							
							if !strings.Contains(docContent, "<w:body>") {
								// If no body tag exists, we need to create basic document structure
								docContent = fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Document properties have been updated.</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="%s"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  </w:body>
</w:document>`, headerRelId)
								content = []byte(docContent)
								fmt.Printf("Created new document.xml structure with header reference\n")
							}
						}
					}
				}
			}
			
			// Modify the XML content to update properties
			newContent, err := updateXMLProperties(content, properties)
			if err != nil {
				fmt.Printf("Warning: error updating XML properties in %s: %v\n", file.Name, err)
				// Continue with original content if update fails
			} else {
				content = newContent
			}
		}		// Add the file (original or modified) to the new archive
		fileWriter, err := archive.Create(file.Name)
		if err != nil {
			return fmt.Errorf("error creating file in new archive: %w", err)
		}
		
		_, err = fileWriter.Write(content)
		if err != nil {
			return fmt.Errorf("error writing file content to new archive: %w", err)
		}
	}

	// Check if we need to create any missing property files
	for propFile, found := range modifiedFiles {
		if !found {
			fmt.Printf("Creating missing property file: %s\n", propFile)
			
			// Create a basic XML structure for the property file
			xmlContent := createDefaultPropertyXML(propFile, properties)
			
			// Add the new file to the archive
			fileWriter, err := archive.Create(propFile)
			if err != nil {
				fmt.Printf("Warning: error creating new property file %s: %v\n", propFile, err)
				continue
			}
			
			_, err = fileWriter.Write([]byte(xmlContent))
			if err != nil {
				fmt.Printf("Warning: error writing new property file %s: %v\n", propFile, err)
			}
		}
	}
	
	// Check specifically for header and footer files - we need to create at least one header file
	headerFiles := []string{"word/header1.xml", "word/header2.xml", "word/header3.xml"}
	
	headerFound := false
	for _, file := range headerFiles {
		if modifiedFiles[file] {
			headerFound = true
			break
		}
	}
	
	// Create at least header1.xml if no headers were found
	if !headerFound {
		fmt.Printf("No header files found, creating a default header with properties\n")
		
		// Add the header file to the archive
		headerFile := "word/header1.xml"
		headerContent := createDefaultHeaderFooterXML(headerFile, properties)
		
		fileWriter, err := archive.Create(headerFile)
		if err != nil {
			fmt.Printf("Warning: error creating header file: %v\n", err)
		} else {
			_, err = fileWriter.Write([]byte(headerContent))
			if err != nil {
				fmt.Printf("Warning: error writing header file: %v\n", err)
			} else {
				fmt.Printf("Successfully created new header file with properties\n")
				modifiedFiles[headerFile] = true
				
				// Now we need to ensure document.xml references this header
				// This will be handled in a separate function to update the Word document structure
			}
		}
	}

	// If we created a header file, ensure it's referenced in the document
	if modifiedFiles["word/header1.xml"] {
		fmt.Printf("Ensuring document references the newly created header\n")
		
		// We need to update the document sections to reference the header
		// This requires:
		// 1. Adding a relationship in word/_rels/document.xml.rels
		// 2. Adding a headerReference in the section properties of word/document.xml
		// 3. Updating [Content_Types].xml to include header content type
		
		// Create or update the relationship file
		relsFile := "word/_rels/document.xml.rels"
		relsExists := false
		var existingRelsContent []byte
		
		// Check if relationship file already exists and read its content
		for _, file := range reader.File {
			if file.Name == relsFile {
				relsExists = true
				
				fileReader, err := file.Open()
				if err == nil {
					existingRelsContent, err = io.ReadAll(fileReader)
					fileReader.Close()
					if err != nil {
						fmt.Printf("Warning: error reading relationship file: %v\n", err)
						existingRelsContent = nil
					}
				}
				break
			}
		}
		
		// Create or update the relationship file
		fmt.Printf("Creating/updating relationship file to reference header\n")
		
		var relsContent string
		
		if relsExists && len(existingRelsContent) > 0 {
			// Check if the header relationship already exists
			if strings.Contains(string(existingRelsContent), "relationships/header") {
				fmt.Printf("Header relationship already exists in rels file\n")
				// Keep existing content
				relsContent = string(existingRelsContent)
			} else {
				// Add header relationship to existing relationships
				relsStr := string(existingRelsContent)
				closingTag := "</Relationships>"
				closingPos := strings.LastIndex(relsStr, closingTag)
				
				if closingPos > 0 {
					// Insert the new relationship before closing tag
					headerRel := `  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>`
					relsContent = relsStr[:closingPos] + headerRel + "\n" + relsStr[closingPos:]
				} else {
					// Invalid format, create new
					relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`
				}
			}
		} else {
			// Create a new relationship file with the header relationship
			relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`
		}
		
		// Ensure directories exist (needed for _rels subfolder)
		fileWriter, err := archive.Create(relsFile)
		if err != nil {
			fmt.Printf("Warning: error creating relationship file: %v\n", err)
		} else {
			_, err = fileWriter.Write([]byte(relsContent))
			if err != nil {
				fmt.Printf("Warning: error writing relationship file: %v\n", err)
			} else {
				fmt.Printf("Successfully created/updated relationship file\n")
			}
		}
		
		// Now check the content types file to ensure it includes headers
		contentTypesFile := "[Content_Types].xml"
		contentTypesExists := false
		var contentTypesContent []byte
		
		for _, file := range reader.File {
			if file.Name == contentTypesFile {
				contentTypesExists = true
				
				// Read the content types file
				fileReader, err := file.Open()
				if err == nil {
					contentTypesContent, err = io.ReadAll(fileReader)
					fileReader.Close()
					if err != nil {
						fmt.Printf("Warning: error reading content types file: %v\n", err)
					}
				} else {
					fmt.Printf("Warning: error opening content types file: %v\n", err)
				}
				
				break
			}
		}
		
		// If content types file exists, ensure it has header content type
		if contentTypesExists && len(contentTypesContent) > 0 {
			contentTypesStr := string(contentTypesContent)
			headerContentType := `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>`
			
			// Check if header content type is already included
			if !strings.Contains(contentTypesStr, "header+xml") {
				fmt.Printf("Adding header content type to content types file\n")
				
				// Find the closing tag and insert before it
				closingPos := strings.LastIndex(contentTypesStr, "</Types>")
				if closingPos > 0 {
					contentTypesStr = contentTypesStr[:closingPos] + headerContentType + contentTypesStr[closingPos:]
					
					// Create updated content types file
					fileWriter, err := archive.Create(contentTypesFile)
					if err != nil {
						fmt.Printf("Warning: error creating content types file: %v\n", err)
					} else {
						_, err = fileWriter.Write([]byte(contentTypesStr))
						if err != nil {
							fmt.Printf("Warning: error writing content types file: %v\n", err)
						} else {
							fmt.Printf("Successfully updated content types file\n")
						}
					}
				}
			} else {
				fmt.Printf("Content types file already includes header content type\n")
			}
		}
		
		// Document.xml updates are handled in the document processing section
	}
	
	// Close the archive and zipWriter
	err = archive.Close()
	if err != nil {
		return fmt.Errorf("error closing archive: %w", err)
	}
	err = zipWriter.Close()
	if err != nil {
		return fmt.Errorf("error closing zip writer: %w", err)
	}

	fmt.Printf("Successfully created updated DOCX file\n")

	// Verify the new file exists and is not empty
	fileInfo, err := os.Stat(tempFilePath)
	if err != nil {
		return fmt.Errorf("error checking new DOCX file: %w", err)
	}
	if fileInfo.Size() == 0 {
		return fmt.Errorf("new DOCX file is empty")
	}

	fmt.Printf("New DOCX file size: %d bytes\n", fileInfo.Size())

	// Replace the original file with the modified file
	err = os.Rename(tempFilePath, docxPath)
	if err != nil {
		// On some systems, rename across devices may fail
		// Fall back to copy and delete
		fmt.Printf("Rename failed, falling back to copy: %v\n", err)
		
		srcFile, err := os.Open(tempFilePath)
		if err != nil {
			return fmt.Errorf("error opening temp file for copy: %w", err)
		}
		defer srcFile.Close()
		
		destFile, err := os.Create(docxPath)
		if err != nil {
			return fmt.Errorf("error creating destination file for copy: %w", err)
		}
		defer destFile.Close()
		
		_, err = io.Copy(destFile, srcFile)
		if err != nil {
			return fmt.Errorf("error copying file content: %w", err)
		}
		
		// Ensure file is written to disk
		err = destFile.Sync()
		if err != nil {
			return fmt.Errorf("error syncing file: %w", err)
		}
	}

	fmt.Printf("Successfully updated DOCX document properties\n")
	return nil
}

// createDefaultHeaderFooterXML creates XML for a header or footer file with properties
func createDefaultHeaderFooterXML(fileName string, properties map[string]string) string {
	fmt.Printf("Creating default header/footer XML for %s with %d properties\n", fileName, len(properties))
	
	isHeader := strings.Contains(fileName, "header")
	
	// Determine the XML tag to use
	containerTag := "w:ftr"
	if isHeader {
		containerTag = "w:hdr"
	}
	
	// Create a simplified header with just text paragraphs instead of a complex table
	// This is much more likely to be compatible with Word's expectations
	
	// Start with the standard XML header
	xml := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<%s xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`, containerTag)

	// Add key properties as simple paragraphs
	title := properties["Title"]
	docNumber := properties["DocNumber"]
	status := properties["Status"]
	
	// XML-encode the values to prevent XML injection
	title = strings.ReplaceAll(title, "&", "&amp;")
	title = strings.ReplaceAll(title, "<", "&lt;")
	title = strings.ReplaceAll(title, ">", "&gt;")
	title = strings.ReplaceAll(title, "\"", "&quot;")
	title = strings.ReplaceAll(title, "'", "&apos;")
	
	docNumber = strings.ReplaceAll(docNumber, "&", "&amp;")
	docNumber = strings.ReplaceAll(docNumber, "<", "&lt;")
	docNumber = strings.ReplaceAll(docNumber, ">", "&gt;")
	docNumber = strings.ReplaceAll(docNumber, "\"", "&quot;")
	docNumber = strings.ReplaceAll(docNumber, "'", "&apos;")
	
	status = strings.ReplaceAll(status, "&", "&amp;")
	status = strings.ReplaceAll(status, "<", "&lt;")
	status = strings.ReplaceAll(status, ">", "&gt;")
	status = strings.ReplaceAll(status, "\"", "&quot;")
	status = strings.ReplaceAll(status, "'", "&apos;")
	
	// Add simple text paragraphs with main document information
	xml += `
  <w:p>
    <w:r>
      <w:t>Document Properties Updated</w:t>
    </w:r>
  </w:p>`
    
	// Only add title if it exists
	if title != "" {
		xml += fmt.Sprintf(`
  <w:p>
    <w:r>
      <w:t>Title: %s</w:t>
    </w:r>
  </w:p>`, title)
	}
	
	// Add doc number and status if they exist
	if docNumber != "" {
		xml += fmt.Sprintf(`
  <w:p>
    <w:r>
      <w:t>Doc#: %s</w:t>
    </w:r>
  </w:p>`, docNumber)
	}
	
	if status != "" {
		xml += fmt.Sprintf(`
  <w:p>
    <w:r>
      <w:t>Status: %s</w:t>
    </w:r>
  </w:p>`, status)
	}

	// Close the container tag
	xml += fmt.Sprintf(`
</%s>`, containerTag)

	return xml
}

// createDefaultPropertyXML creates a default XML structure for a property file
func createDefaultPropertyXML(fileName string, properties map[string]string) string {
	switch {
	case strings.Contains(fileName, "header") || strings.Contains(fileName, "footer"):
		// Create header or footer file
		return createDefaultHeaderFooterXML(fileName, properties)
	case strings.Contains(fileName, "core.xml"):
		// Create core.xml with standard Microsoft Word structure
		coreXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                  xmlns:dc="http://purl.org/dc/elements/1.1/"
                  xmlns:dcterms="http://purl.org/dc/terms/"
                  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>%s</dc:title>
    <dc:subject>%s</dc:subject>
    <dc:creator>%s</dc:creator>
    <cp:keywords>%s</cp:keywords>
    <dc:description>%s</dc:description>
    <cp:lastModifiedBy>%s</cp:lastModifiedBy>
    <cp:revision>1</cp:revision>
    <cp:category>%s</cp:category>
    <dcterms:created xsi:type="dcterms:W3CDTF">%s</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">%s</dcterms:modified>
</cp:coreProperties>`

		title := properties["Title"]
		summary := properties["Summary"]
		creator := properties["Creator"]
		if creator == "" {
			creator = "Hermes System"
		}
		
		// Map our properties to standard Word document properties
		docType := properties["DocType"]
		
		// Format creation date
		createdDate := time.Now()
		if dateStr, exists := properties["CreatedDate"]; exists && dateStr != "" {
			if parsedDate, err := time.Parse("2006-01-02", dateStr); err == nil {
				createdDate = parsedDate
			}
		}
		
		formattedDate := createdDate.Format("2006-01-02T15:04:05Z")
		modifiedDate := time.Now().Format("2006-01-02T15:04:05Z")
		
		// Use properties or empty strings
		keywords := fmt.Sprintf("DocNumber:%s Status:%s Product:%s", 
			properties["DocNumber"], properties["Status"], properties["Product"])
			
		return fmt.Sprintf(coreXML, title, summary, creator, keywords, summary, 
			creator, docType, formattedDate, modifiedDate)
		
	case strings.Contains(fileName, "custom.xml"):
		// Create custom.xml with standard Microsoft Word custom properties structure
		customXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties"
           xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
`
		// The standard properties we want to ensure exist
		requiredProps := []string{
			"DocNumber", "Status", "DocType", "Product", "Creator", 
			"Contributors", "Summary", "Title", "CreatedDate",
		}
		
		// Add all properties
		pid := 2 // Start with pid 2 as per OOXML spec
		
		// First add our required properties
		for _, key := range requiredProps {
			value := properties[key]
			
			// XML-encode the value to prevent XML injection
			value = strings.ReplaceAll(value, "&", "&amp;")
			value = strings.ReplaceAll(value, "<", "&lt;")
			value = strings.ReplaceAll(value, ">", "&gt;")
			value = strings.ReplaceAll(value, "\"", "&quot;")
			value = strings.ReplaceAll(value, "'", "&apos;")
			
			customXML += fmt.Sprintf(`    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="%d" name="%s">
        <vt:lpwstr>%s</vt:lpwstr>
    </property>
`, pid, key, value)
			pid++
		}
		
		// Then add any additional properties not in our required list
		for key, value := range properties {
			// Skip if it's one of our required properties that we already added
			isRequired := false
			for _, reqKey := range requiredProps {
				if key == reqKey {
					isRequired = true
					break
				}
			}
			
			if !isRequired {
				// XML-encode the value to prevent XML injection
				value = strings.ReplaceAll(value, "&", "&amp;")
				value = strings.ReplaceAll(value, "<", "&lt;")
				value = strings.ReplaceAll(value, ">", "&gt;")
				value = strings.ReplaceAll(value, "\"", "&quot;")
				value = strings.ReplaceAll(value, "'", "&apos;")
				
				customXML += fmt.Sprintf(`    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="%d" name="%s">
        <vt:lpwstr>%s</vt:lpwstr>
    </property>
`, pid, key, value)
				pid++
			}
		}
		
		customXML += `</Properties>`
		return customXML
	
	case strings.Contains(fileName, "app.xml"):
		// Create app.xml with standard Microsoft Word application properties
		appXML := `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
           xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Template>%s</Template>
    <Company>%s</Company>
    <Manager>%s</Manager>
    <Application>Hermes Document Management</Application>
    <DocSecurity>0</DocSecurity>
    <ScaleCrop>false</ScaleCrop>
    <HeadingPairs>
        <vt:vector size="10" baseType="variant">
            <vt:variant>
                <vt:lpstr>Title</vt:lpstr>
            </vt:variant>
            <vt:variant>
                <vt:i4>1</vt:i4>
            </vt:variant>
        </vt:vector>
    </HeadingPairs>
    <TitlesOfParts>
        <vt:vector size="1" baseType="lpstr">
            <vt:lpstr>%s</vt:lpstr>
        </vt:vector>
    </TitlesOfParts>
</Properties>`

		docType := properties["DocType"]
		product := properties["Product"]
		creator := properties["Creator"]
		title := properties["Title"]
		
		return fmt.Sprintf(appXML, docType, product, creator, title)
	
	case strings.Contains(fileName, "document.xml"):
		// We don't modify the main document content directly
		return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
		
	default:
		// Return an empty XML for other files
		return "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
	}
}

// updateXMLProperties updates properties in XML content
func updateXMLProperties(content []byte, properties map[string]string) ([]byte, error) {
	fmt.Printf("Updating XML properties with %d properties\n", len(properties))
	
	// First try to properly parse the XML
	var parsedXML map[string]interface{}
	if err := xml.Unmarshal(content, &parsedXML); err != nil {
		fmt.Printf("Warning: Could not parse XML as generic structure: %v\n", err)
		// Fall back to string replacement if XML parsing fails
		return updateXMLPropertiesWithStringReplacement(content, properties)
	}
	
	// Try specific XML formats that might be in the document
	
	// Microsoft Office Document Properties format
	if tryUpdateCoreProperties(content, properties) {
		fmt.Printf("Updated properties using core.xml format\n")
		return content, nil
	}
	
	// Custom document properties format
	if tryUpdateCustomProperties(content, properties) {
		fmt.Printf("Updated properties using custom.xml format\n")
		return content, nil
	}
	
	// If specific formats failed, fall back to string replacement
	fmt.Printf("Falling back to string replacement for XML properties\n")
	return updateXMLPropertiesWithStringReplacement(content, properties)
}

// tryUpdateCoreProperties attempts to update Office core properties XML
func tryUpdateCoreProperties(content []byte, properties map[string]string) bool {
	// Note: We know the standard property mappings in Word documents:
	// Title → dc:title
	// Creator → dc:creator
	// LastModifiedBy → cp:lastModifiedBy
	// Subject/Summary → dc:subject
	// Description → dc:description
	// Keywords/Tags → cp:keywords
	
	// Check if this looks like a core.xml file
	if !strings.Contains(string(content), "coreProperties") {
		return false
	}
	
	fmt.Printf("Found core.xml structure, attempting to update core properties\n")
	
	// Create a struct for XML parsing
	type CoreProperties struct {
		XMLName xml.Name `xml:"coreProperties"`
		Title string `xml:"title"`
		Creator string `xml:"creator"`
		Subject string `xml:"subject"`
		Description string `xml:"description"`
		LastModifiedBy string `xml:"lastModifiedBy"`
	}
	
	var coreProps CoreProperties
	err := xml.Unmarshal(content, &coreProps)
	if err != nil {
		fmt.Printf("Error parsing core properties: %v\n", err)
		return false
	}
	
	// Update the struct with our values
	modified := false
	
	if title, ok := properties["Title"]; ok && title != "" {
		coreProps.Title = title
		modified = true
		fmt.Printf("Updated core property: Title = %s\n", title)
	}
	
	if creator, ok := properties["Creator"]; ok && creator != "" {
		coreProps.Creator = creator
		coreProps.LastModifiedBy = creator
		modified = true
		fmt.Printf("Updated core property: Creator = %s\n", creator)
	}
	
	if summary, ok := properties["Summary"]; ok && summary != "" {
		coreProps.Subject = summary
		coreProps.Description = summary
		modified = true
		fmt.Printf("Updated core property: Subject/Description = %s\n", summary)
	}
	
	if modified {
		// Marshal back to XML
		newContent, err := xml.MarshalIndent(coreProps, "", "  ")
		if err != nil {
			fmt.Printf("Error marshaling updated core properties: %v\n", err)
			return false
		}
		
		// Replace content
		copy(content, newContent)
		return true
	}
	
	return false
}

// tryUpdateCustomProperties attempts to update Office custom properties XML
func tryUpdateCustomProperties(content []byte, properties map[string]string) bool {
	// Check if this looks like a custom.xml file
	if !strings.Contains(string(content), "custom-properties") {
		return false
	}
	
	fmt.Printf("Found custom.xml structure, attempting to update custom properties\n")
	
	// Define custom properties structure 
	type CustomProperty struct {
		FMTID string `xml:"fmtid,attr"`
		PID string `xml:"pid,attr"`
		Name string `xml:"name,attr"`
		Value string `xml:"lpwstr"`
	}
	
	type CustomProperties struct {
		XMLName xml.Name `xml:"Properties"`
		Properties []CustomProperty `xml:"property"`
	}
	
	var customProps CustomProperties
	err := xml.Unmarshal(content, &customProps)
	if err != nil {
		fmt.Printf("Error parsing custom properties: %v\n", err)
		return false
	}
	
	// Update existing properties
	modified := false
	for i, prop := range customProps.Properties {
		if value, exists := properties[prop.Name]; exists && value != "" {
			customProps.Properties[i].Value = value
			fmt.Printf("Updated existing custom property: %s = %s\n", prop.Name, value)
			modified = true
			// Remove from map to track which ones we've handled
			delete(properties, prop.Name)
		}
	}
	
	// Add new properties for any remaining in our map
	nextPID := 2
	if len(customProps.Properties) > 0 {
		// Find the highest existing PID and increment
		for _, prop := range customProps.Properties {
			if pid, err := strconv.Atoi(prop.PID); err == nil {
				if pid >= nextPID {
					nextPID = pid + 1
				}
			}
		}
	}
	
	// Add remaining properties
	for key, value := range properties {
		newProp := CustomProperty{
			FMTID: "{D5CDD505-2E9C-101B-9397-08002B2CF9AE}",
			PID:   strconv.Itoa(nextPID),
			Name:  key,
			Value: value,
		}
		customProps.Properties = append(customProps.Properties, newProp)
		fmt.Printf("Added new custom property: %s = %s\n", key, value)
		nextPID++
		modified = true
	}
	
	if modified {
		// Marshal back to XML
		newContent, err := xml.MarshalIndent(customProps, "", "  ")
		if err != nil {
			fmt.Printf("Error marshaling updated custom properties: %v\n", err)
			return false
		}
		
		// Replace content
		copy(content, newContent)
		return true
	}
	
	return false
}

// updateXMLPropertiesWithStringReplacement uses simple string manipulation to update XML properties
func updateXMLPropertiesWithStringReplacement(content []byte, properties map[string]string) ([]byte, error) {
	fmt.Printf("Using string replacement to update XML properties\n")
	contentStr := string(content)
	
	// Check if this is the main document.xml file
	isDocumentXML := strings.Contains(contentStr, "<w:document") || strings.Contains(contentStr, "wordDocument")
	
	// Check if this is a header or footer file
	isHeaderFooter := strings.Contains(contentStr, "<w:hdr") || strings.Contains(contentStr, "<w:ftr")
	
	for key, value := range properties {
		fmt.Printf("Looking for property: %s with value: %s\n", key, value)
		
		// For header/footer files, also look for inline property references like ${PropertyName}
		if isHeaderFooter {
			// Pattern to find field codes and placeholder text in headers/footers
			placeholders := []string{
				fmt.Sprintf("${%s}", key),
				fmt.Sprintf("$%s$", key),
				fmt.Sprintf("\\[%s\\]", key),
				fmt.Sprintf("\\{%s\\}", key),
			}
			
			for _, placeholder := range placeholders {
				if strings.Contains(contentStr, placeholder) {
					fmt.Printf("Found placeholder %s in header/footer\n", placeholder)
					// Replace all occurrences of this placeholder
					contentStr = strings.ReplaceAll(contentStr, placeholder, value)
					fmt.Printf("Replaced placeholder with value: %s\n", value)
				}
			}
			
			// Also check for Word field codes in w:t elements
			fieldPattern := fmt.Sprintf("<w:t[^>]*>([^<]*%s[^<]*)</w:t>", key)
			fieldRegex := regexp.MustCompile(fieldPattern)
			
			if matches := fieldRegex.FindAllStringSubmatch(contentStr, -1); len(matches) > 0 {
				for _, match := range matches {
					if len(match) >= 2 {
						fullMatch := match[0]
						textContent := match[1]
						
						// Replace just the key part with the value
						newText := strings.ReplaceAll(textContent, key, value)
						newElement := strings.Replace(fullMatch, textContent, newText, 1)
						
						contentStr = strings.Replace(contentStr, fullMatch, newElement, 1)
						fmt.Printf("Updated field code in header/footer: %s → %s\n", key, value)
					}
				}
			}
		}
		
		// Try different tag formats
		formats := []struct {
			openTag  string
			closeTag string
		}{
			// Standard format
			{fmt.Sprintf("<%s>", key), fmt.Sprintf("</%s>", key)},
			// With namespace prefix (cp:)
			{fmt.Sprintf("<cp:%s>", key), fmt.Sprintf("</cp:%s>", key)},
			// With dc namespace
			{fmt.Sprintf("<dc:%s>", key), fmt.Sprintf("</dc:%s>", key)},
			// With property tag and name attribute
			{fmt.Sprintf("<property name=\"%s\">", key), "</property>"},
			{fmt.Sprintf("<property fmtid=\"{D5CDD505-2E9C-101B-9397-08002B2CF9AE}\" pid=\"2\" name=\"%s\">", key), "</property>"},
		}
		
		propertyUpdated := false
		
		for _, format := range formats {
			openTag := format.openTag
			closeTag := format.closeTag
			
			// Check if this format exists in the document
			if strings.Contains(contentStr, openTag) && strings.Contains(contentStr, closeTag) {
				fmt.Printf("Found match for format: %s ... %s\n", openTag, closeTag)
				
				// Find all occurrences and update them
				for strings.Contains(contentStr, openTag) {
					// Find the start and end indices of the property value
					startIdx := strings.Index(contentStr, openTag) + len(openTag)
					endIdx := strings.Index(contentStr[startIdx:], closeTag)
					
					if endIdx < 0 {
						break // Malformed XML, no closing tag found
					}
					
					endIdx += startIdx
					
					// Replace the value - make sure we're only replacing between the tags
					if startIdx >= 0 && endIdx >= 0 && startIdx <= endIdx {
						// XML-encode the value to prevent XML injection
						encodedValue := strings.ReplaceAll(value, "&", "&amp;")
						encodedValue = strings.ReplaceAll(encodedValue, "<", "&lt;")
						encodedValue = strings.ReplaceAll(encodedValue, ">", "&gt;")
						encodedValue = strings.ReplaceAll(encodedValue, "\"", "&quot;")
						encodedValue = strings.ReplaceAll(encodedValue, "'", "&apos;")
						
						contentStr = contentStr[:startIdx] + encodedValue + contentStr[endIdx:]
						propertyUpdated = true
						fmt.Printf("Updated property %s with value %s\n", key, value)
					}
				}
			}
		}
		
		if !propertyUpdated && !isHeaderFooter {
			// We didn't update a property and this isn't a header/footer (which we already tried to update)
			fmt.Printf("Could not find property %s in the XML content\n", key)
			
			// If this is document.xml, try to insert the property in a good location
			if isDocumentXML {
				contentStr = insertPropertyIntoDocumentXML(contentStr, key, value)
			} else if isHeaderFooter {
				contentStr = insertPropertyIntoHeaderFooter(contentStr, key, value)
			} else if strings.Contains(contentStr, "<Properties") {
				// This is likely a custom properties file
				contentStr = insertPropertyIntoCustomPropertiesXML(contentStr, key, value)
			} else if strings.Contains(contentStr, "coreProperties") {
				// This is likely core properties
				contentStr = insertPropertyIntoCorePropertiesXML(contentStr, key, value)
			}
		}
	}
	
	return []byte(contentStr), nil
}

// insertPropertyIntoDocumentXML inserts a property into the Word document XML
func insertPropertyIntoDocumentXML(content string, key, value string) string {
	fmt.Printf("Attempting to insert property %s into document.xml\n", key)
	
	// Check if this is a header or footer file
	isHeaderFooter := strings.Contains(content, "<w:hdr") || strings.Contains(content, "<w:ftr")
	
	// XML-encode the value to prevent XML injection
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	value = strings.ReplaceAll(value, ">", "&gt;")
	value = strings.ReplaceAll(value, "\"", "&quot;")
	value = strings.ReplaceAll(value, "'", "&apos;")
	
	// If this is a header or footer, handle differently
	if isHeaderFooter {
		return insertPropertyIntoHeaderFooter(content, key, value)
	}
	
	// Define where in the document we'll add the custom property
	// We'll look for standard markers in the Word document structure
	
	// For Word documents, we need to add the property as a document variable or a custom XML part
	// First, look for an existing w:docVar section
	docVarSectionStart := strings.Index(content, "<w:docVars>")
	docVarSectionEnd := strings.Index(content, "</w:docVars>")
	
	if docVarSectionStart >= 0 && docVarSectionEnd > docVarSectionStart {
		// Found existing docVars section, add our property there
		docVarTag := fmt.Sprintf("<w:docVar w:name=\"%s\" w:val=\"%s\"/>", key, value)
		insertPos := docVarSectionEnd
		content = content[:insertPos] + docVarTag + content[insertPos:]
		fmt.Printf("Added document variable: %s = %s\n", key, value)
		return content
	}
	
	// Look for settings or document props section
	settingsPos := strings.Index(content, "<w:settings")
	if settingsPos >= 0 {
		// Add docVars section before settings
		docVarSection := fmt.Sprintf("<w:docVars><w:docVar w:name=\"%s\" w:val=\"%s\"/></w:docVars>", key, value)
		content = content[:settingsPos] + docVarSection + content[settingsPos:]
		fmt.Printf("Created docVars section and added property: %s = %s\n", key, value)
		return content
	}
	
	// If we can find the document body section, add it there as a custom XML element
	bodyStart := strings.Index(content, "<w:body>")
	if bodyStart >= 0 {
		// Add a styled paragraph at the top with the property value
		// This will be visible in the document, but it's a fallback for when we can't add proper docVars
		paraTag := fmt.Sprintf(`
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
        </w:pPr>
        <w:r>
          <w:t>%s: %s</w:t>
        </w:r>
      </w:p>`, key, value)
        
		insertPos := bodyStart + 8 // After "<w:body>"
		content = content[:insertPos] + paraTag + content[insertPos:]
		fmt.Printf("Added property as visible paragraph: %s = %s\n", key, value)
		return content
	}
	
	// Last resort: try to add it near the end of the file but before closing tag
	closingTag := "</w:document>"
	closingPos := strings.LastIndex(content, closingTag)
	if closingPos >= 0 {
		// Add a comment with our property
		commentTag := fmt.Sprintf("<!-- Custom Property: %s = %s -->", key, value)
		content = content[:closingPos] + commentTag + content[closingPos:]
		fmt.Printf("Added property as comment: %s = %s\n", key, value)
		return content
	}
	
	fmt.Printf("Could not find a suitable place to insert property %s in document.xml\n", key)
	return content
}

// insertPropertyIntoHeaderFooter inserts a property into a Word document header or footer XML
func insertPropertyIntoHeaderFooter(content string, key, value string) string {
	fmt.Printf("Inserting property %s into header/footer XML\n", key)
	
	// Determine what type of file this is
	isHeader := strings.Contains(content, "<w:hdr")
	isFooter := strings.Contains(content, "<w:ftr")
	
	// Try to find an existing paragraph that might contain our property
	keyPattern := fmt.Sprintf(">\\s*%s\\s*:?\\s*.*?<", key)
	keyRegex := regexp.MustCompile(keyPattern)
	
	if keyRegex.MatchString(content) {
		fmt.Printf("Found existing general property text for %s in header/footer\n", key)
		
		// Extract the paragraph containing this text
		pStart := strings.LastIndex(content[:keyRegex.FindStringIndex(content)[0]], "<w:p")
		if pStart >= 0 {
			pEnd := strings.Index(content[pStart:], "</w:p>")
			if pEnd >= 0 {
				pEnd += pStart + 5 // Include "</w:p>"
				
				// Get the paragraph content
				paragraph := content[pStart:pEnd]
				
				// Replace the text content
				// Look for w:t elements and replace their content if it matches our key
				tPattern := fmt.Sprintf("<w:t[^>]*>(\\s*%s\\s*:?\\s*.*?)</w:t>", key)
				tRegex := regexp.MustCompile(tPattern)
				
				if tRegex.MatchString(paragraph) {
					// Replace the text in the w:t element
					newParagraph := tRegex.ReplaceAllString(paragraph, fmt.Sprintf("<w:t>%s: %s</w:t>", key, value))
					
					// Replace the paragraph in the content
					content = content[:pStart] + newParagraph + content[pEnd:]
					fmt.Printf("Updated existing property in header/footer: %s = %s\n", key, value)
					return content
				}
			}
		}
	}
	
	// If we couldn't find and update an existing property, we'll add a new paragraph
	// Find a suitable insertion point (before the closing tag of the main element)
	var insertPoint int
	var containerEnd string
	
	if isHeader {
		containerEnd = "</w:hdr>"
	} else if isFooter {
		containerEnd = "</w:ftr>"
	} else {
		containerEnd = "</w:body>"
	}
	
	insertPoint = strings.LastIndex(content, containerEnd)
	
	if insertPoint > 0 {
		// Add a simple new paragraph with our property
		newParagraph := fmt.Sprintf(`
  <w:p>
    <w:r>
      <w:t>%s: %s</w:t>
    </w:r>
  </w:p>`, key, value)
		
		content = content[:insertPoint] + newParagraph + content[insertPoint:]
		
		fmt.Printf("Added new property paragraph to header/footer: %s = %s\n", key, value)
		return content
	}
	
	fmt.Printf("Could not find suitable place to insert property in header/footer\n")
	return content
}

// insertPropertyIntoCustomPropertiesXML inserts a property into custom properties XML
func insertPropertyIntoCustomPropertiesXML(content string, key, value string) string {
	fmt.Printf("Inserting property into custom properties: %s = %s\n", key, value)
	
	// Find the highest pid in use
	pidRegex := `pid="(\d+)"`
	pidMatches := regexp.MustCompile(pidRegex).FindAllStringSubmatch(content, -1)
	
	nextPid := 2 // default starting pid
	if len(pidMatches) > 0 {
		for _, match := range pidMatches {
			if len(match) >= 2 {
				if pid, err := strconv.Atoi(match[1]); err == nil {
					if pid >= nextPid {
						nextPid = pid + 1
					}
				}
			}
		}
	}
	
	// XML-encode the value
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	value = strings.ReplaceAll(value, ">", "&gt;")
	value = strings.ReplaceAll(value, "\"", "&quot;")
	value = strings.ReplaceAll(value, "'", "&apos;")
	
	// Create the new property element
	newProperty := fmt.Sprintf(`    <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="%d" name="%s">
        <vt:lpwstr>%s</vt:lpwstr>
    </property>
`, nextPid, key, value)
	
	// Find the closing Properties tag
	closingPos := strings.LastIndex(content, "</Properties>")
	if closingPos >= 0 {
		// Insert the new property before the closing tag
		content = content[:closingPos] + newProperty + content[closingPos:]
		fmt.Printf("Added custom property: %s = %s with pid=%d\n", key, value, nextPid)
		return content
	}
	
	fmt.Printf("Could not find a suitable place to insert property in custom properties\n")
	return content
}

// insertPropertyIntoCorePropertiesXML inserts a property into core properties XML
func insertPropertyIntoCorePropertiesXML(content string, key, value string) string {
	fmt.Printf("Inserting property into core properties: %s = %s\n", key, value)
	
	// Map our properties to standard core properties
	propertyMapping := map[string]string{
		"Title":       "dc:title",
		"Creator":     "dc:creator",
		"Summary":     "dc:subject",
		"Description": "dc:description",
		"Status":      "cp:contentStatus",
		"DocType":     "cp:category",
		"Product":     "cp:contentStatus", // Fallback, not ideal
	}
	
	// XML-encode the value
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	value = strings.ReplaceAll(value, ">", "&gt;")
	value = strings.ReplaceAll(value, "\"", "&quot;")
	value = strings.ReplaceAll(value, "'", "&apos;")
	
	// Determine which core property element to use
	elementName, ok := propertyMapping[key]
	if !ok {
		// If there's no standard mapping, default to keywords
		elementName = "cp:keywords"
		value = fmt.Sprintf("%s:%s %s", key, value, extractKeywords(content))
	}
	
	// See if the element already exists
	openTag := "<" + elementName + ">"
	closeTag := "</" + elementName + ">"
	
	if strings.Contains(content, openTag) && strings.Contains(content, closeTag) {
		// Element exists, update it
		startIdx := strings.Index(content, openTag) + len(openTag)
		endIdx := strings.Index(content, closeTag)
		if startIdx >= 0 && endIdx >= 0 && startIdx <= endIdx {
			content = content[:startIdx] + value + content[endIdx:]
			fmt.Printf("Updated core property element: %s\n", elementName)
			return content
		}
	}
	
	// Element doesn't exist, add it
	closingPos := strings.LastIndex(content, "</cp:coreProperties>")
	if closingPos >= 0 {
		newElement := fmt.Sprintf("    <%s>%s</%s>\n", elementName, value, elementName)
		content = content[:closingPos] + newElement + content[closingPos:]
		fmt.Printf("Added core property element: %s\n", elementName)
		return content
	}
	
	fmt.Printf("Could not find a suitable place to insert property in core properties\n")
	return content
}

// extractKeywords extracts any existing keywords from the content
func extractKeywords(content string) string {
	// Look for keywords tag
	keywordsStart := strings.Index(content, "<cp:keywords>")
	keywordsEnd := strings.Index(content, "</cp:keywords>")
	
	if keywordsStart >= 0 && keywordsEnd > keywordsStart {
		keywordsStart += 13 // Length of "<cp:keywords>"
		return content[keywordsStart:keywordsEnd]
	}
	
	return ""
}

// ReplaceDocumentHeaderWithContentUpdate updates the document content
// by downloading, modifying, and re-uploading the file (no headers, just document content)
func (s *Service) ReplaceDocumentHeaderWithContentUpdate(fileID string, properties map[string]string) error {
	fmt.Printf("Starting document content update for file ID: %s\n", fileID)
	
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
	
	fmt.Printf("Using temp directory: %s\n", tempDir)
	fmt.Printf("Processing file: %s (Extension: %s)\n", 
		fileDetails.Name, fileDetails.FileExtension)
	
	// Download the file to the temporary directory
	tempFilePath := filepath.Join(tempDir, fileDetails.Name)
	fmt.Printf("Downloading file to: %s\n", tempFilePath)
	
	if err := s.DownloadFile(fileID, tempFilePath); err != nil {
		return fmt.Errorf("error downloading document: %w", err)
	}
	
	fmt.Printf("File downloaded successfully\n")
	
	// Verify file exists and has content
	fileInfo, err := os.Stat(tempFilePath)
	if err != nil {
		return fmt.Errorf("error checking downloaded file: %w", err)
	}
	if fileInfo.Size() == 0 {
		return fmt.Errorf("downloaded file is empty")
	}
	
	fmt.Printf("Downloaded file size: %d bytes\n", fileInfo.Size())
	
	// Update the document content in the DOCX file
	fmt.Printf("Processing DOCX file to update document content\n")
	
	if err := UpdateDocxDocumentContent(tempFilePath, properties); err != nil {
		return fmt.Errorf("error updating document content in DOCX: %w", err)
	}
	
	// Check file size after update
	fileInfo, err = os.Stat(tempFilePath)
	if err != nil {
		return fmt.Errorf("error checking updated file: %w", err)
	}
	
	fmt.Printf("DOCX content updated successfully. Updated file size: %d bytes\n", fileInfo.Size())
	
	// Upload the modified file back to SharePoint
	fmt.Printf("Uploading modified file back to SharePoint\n")
	
	if err := s.UploadFile(tempFilePath, fileID); err != nil {
		return fmt.Errorf("error uploading modified document: %w", err)
	}
	
	fmt.Printf("File uploaded successfully with updated content\n")
	
	return nil
}


