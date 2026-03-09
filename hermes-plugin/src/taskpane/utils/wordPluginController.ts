import CurrentUser from "../interfaces/currentUser";
import IDocumentMetadata from "../interfaces/documentMetadata";
import { Person } from "../interfaces/person";
import { Group } from "../interfaces/group";
import IProduct from "../interfaces/products";
import HermesClient from "./hermesClient";
import WordService from "./wordService";
import { dasherize } from "./productUtils";
import {
  RelatedResource,
  RelatedResourcesResponse,
  formatResourcesForUpdate,
  combineAndSortResources
} from "../interfaces/relatedResources";

export enum DocumentManageStatus {
  Loading,
  NotManaged,
  Managed,
  Error,
  AuthenticationRequired,
}

export type HermesProperties = {
  fileID?: string;
};

export default class WordPluginController {
  private document: IDocumentMetadata;
  private currentUser: CurrentUser;
  products: Record<string, IProduct>;
  constructor(
    private hermesClient: HermesClient,
    private docService: WordService
  ) { }

  /**
   * Checks whether the current document is managed by Hermes.
   *
   * This method retrieves the document properties and attempts to extract Hermes-specific properties.
   * If the document contains a valid Hermes file ID, it fetches the document details from the Hermes client.
   * Returns the appropriate {@link DocumentManageStatus} based on the outcome:
   * - `DocumentManageStatus.Managed` if the document is managed,
   * - `DocumentManageStatus.NotManaged` if not managed or properties are missing,
   * - `DocumentManageStatus.Error` if an error occurs during the process.
   *
   * @returns {Promise<DocumentManageStatus>} A promise that resolves to the document's management status.
   */
  async checkDocumentManageStatus(): Promise<DocumentManageStatus> {
    try {
      // Try to get FileID from keywords first (primary method)
      const docProps = await this.docService.getDocProperties();
      const hermesProps = this.extractHermesProperties(docProps);
      
      let fileID = hermesProps.fileID;
      
      // If not found in keywords, try custom properties (alternative method)
      if (!fileID) {
        console.log("FileID not found in keywords, checking custom properties...");
        fileID = await this.getFileIDFromCustomProperties();
      }
      
      // If still no FileID found, document is not managed
      if (!fileID) {
        console.log("No FileID found in document properties");
        return DocumentManageStatus.NotManaged;
      }
      
      console.log("Found FileID:", fileID);

      // Make document details call first, then parallel calls for products, user details, and archived status
      const doc = await this.hermesClient.getDocumentDetails(fileID);
      if (doc === null || typeof doc === "undefined") {
        return DocumentManageStatus.NotManaged;
      }

      this.document = doc;

      // Helper function to safely execute async operations
      const safeAsync = async <T>(operation: () => Promise<T>, fallback?: T) => {
        try {
          return { success: true, value: await operation(), error: null };
        } catch (error) {
          return { success: false, value: fallback, error };
        }
      };

      // Make products, current user, and archived status calls in parallel to improve performance
      const [productsResult, currentUserResult, archivedResult] = await Promise.all([
        safeAsync(() => this.hermesClient.getProducts(), {}),
        safeAsync(() => this.hermesClient.getCurrentUserDetails()),
        // Load archived status only for drafts
        doc._isDraft ? safeAsync(() => this.hermesClient.getDraftArchivedStatus(fileID), { archived: false }) : Promise.resolve({ success: true, value: { archived: false }, error: null })
      ]);

      // Handle products result
      if (productsResult.success) {
        this.products = productsResult.value;
      } else {
        console.warn('Failed to load products:', productsResult.error);
        this.products = {}; // Fallback to empty object
      }

      // Handle current user result
      if (currentUserResult.success) {
        this.currentUser = currentUserResult.value;
      } else {
        console.error('Failed to load current user details:', currentUserResult.error);
        // Don't set a fallback for currentUser as it might be required for auth
        throw currentUserResult.error;
      }

      // Handle archived status result
      if (archivedResult.success && doc._isDraft) {
        this.document.archived = archivedResult.value.archived;
      }

      return DocumentManageStatus.Managed;
    } catch (error: any) {
      console.log('checkDocumentManageStatus error:', error);

      // Check if this is a 401 authentication error
      if (this.isAuthenticationError(error)) {
        console.log('Authentication required - 401 detected');
        return DocumentManageStatus.AuthenticationRequired;
      }

      return DocumentManageStatus.Error;
    } finally {
    }
  }

  /**
   * Checks if an error is a 401 authentication error.
   *
   * @param error The error to check
   * @returns true if it's a 401 authentication error or redirect to login
   */
  private isAuthenticationError(error: any): boolean {
    // Check for fetch Response with status 401
    if (error?.status === 401) return true;

    // Check for opaqueredirect response (redirect: 'manual' returns this)
    // This happens when ALB OIDC returns 302 to IdP
    if (error?.type === 'opaqueredirect') return true;
    if (error?.status === 0 && error?.type === 'opaqueredirect') return true;

    // Check for status 0 which can indicate a blocked/redirected request
    if (error?.status === 0) return true;

    // Check for 302 redirect status
    if (error?.status === 302) return true;

    // Check for error message containing 401 or redirect indicators
    if (error?.message && (
      error.message.includes('401') ||
      error.message.includes('302') ||
      error.message.includes('NetworkError') ||
      error.message.includes('CORS')
    )) return true;

    // Check for response.status in nested error
    if (error?.response?.status === 401) return true;
    if (error?.response?.status === 302) return true;
    if (error?.response?.type === 'opaqueredirect') return true;

    return false;
  }

  /**
   * Gets the base URL for opening the Hermes application.
   *
   * @returns The base URL of the Hermes application
   */
  getHermesBaseUrl(): string {
    return this.hermesClient['baseUrl'];
  }

  /**
   * Gets the current user's email address.
   *
   * @returns The current user's email address or empty string if not available
   */
  getCurrentUserEmail(): string {
    return this.currentUser?.email || "";
  }

  /**
   * Gets the URL for a specific product area page.
   *
   * @param productName - The name of the product/area (e.g., "Terraform", "Cloud Infrastructure")
   * @returns The complete URL to the product area page
   */
  getProductAreaUrl(productName: string): string {
    const baseUrl = this.getHermesBaseUrl();
    const dasherizedProduct = dasherize(productName);
    return `${baseUrl}/product-areas/${dasherizedProduct}`;
  }

  /**
   * Gets the URL for documents page filtered by owner.
   *
   * @param ownerEmail - The email of the owner to filter by
   * @returns The complete URL to the documents page filtered by the owner
   */
  getDocumentsByOwnerUrl(ownerEmail: string): string {
    const baseUrl = this.getHermesBaseUrl();
    // Create URL-encoded JSON array format: ["email@domain.com"] -> %5B%22email@domain.com%22%5D
    const encodedOwners = encodeURIComponent(JSON.stringify([ownerEmail]));
    return `${baseUrl}/documents?owners=${encodedOwners}`;
  }

  /**
   * Gets the metadata associated with the current document.
   *
   * @returns The metadata of the document as an `IDocumentMetadata` object.
   */
  get documentMetadata(): IDocumentMetadata {
    return this.document;
  }

  /**
   * Extracts Hermes-specific properties from the given Word document properties.
   *
   * This function parses the `keywords` property of the provided `props` object,
   * searching for a "FileID" entry in the format "FileID: <value>" within a
   * semicolon-separated list. If found, it assigns the value to the `fileID`
   * property of the returned `HermesProperties` object.
   *
   * @param props - The Word document properties data to extract Hermes properties from.
   * @returns An object containing the extracted Hermes properties, such as `fileID`.
   */
  extractHermesProperties(props: Word.Interfaces.DocumentPropertiesData) {
    const hermesProps = {} as HermesProperties;
    if (props.keywords) {
      const { keywords } = props;
      if (keywords.includes("FileID:")) {
        const splittedString = keywords.split("; ");
        for (const str of splittedString) {
          const [key, value] = str.split(": ");

          if (key === "FileID" && value) {
            // Clean any trailing semicolons or whitespace from the value
            hermesProps.fileID = value.replace(/[;\s]+$/, "").trim();
          }
        }
      }
    }
    return hermesProps;
  }

  /**
   * Attempts to get the Hermes FileID from custom document properties.
   * This provides an alternative method to retrieve the FileID when it's stored
   * as a custom property (HermesFileID) rather than in keywords.
   *
   * @returns {Promise<string | null>} The FileID if found, null otherwise
   */
  async getFileIDFromCustomProperties(): Promise<string | null> {
    try {
      return await Word.run(async (context) => {
        const customProps = context.document.properties.customProperties;
        customProps.load("items");
        await context.sync();

        // Look for HermesFileID custom property
        for (const prop of customProps.items) {
          prop.load("key,value");
        }
        await context.sync();

        for (const prop of customProps.items) {
          if (prop.key === "HermesFileID" && prop.value) {
            console.log("Found HermesFileID in custom properties:", prop.value);
            return prop.value;
          }
        }

        return null;
      });
    } catch (error) {
      console.error("Error reading custom properties:", error);
      return null;
    }
  }

  /**
   * Checks if the document is managed by Hermes by looking for the HermesManaged custom property.
   *
   * @returns {Promise<boolean>} True if the document has HermesManaged property set to "true"
   */
  async isHermesManagedDocument(): Promise<boolean> {
    try {
      return await Word.run(async (context) => {
        const customProps = context.document.properties.customProperties;
        customProps.load("items");
        await context.sync();

        // Load all property keys and values
        for (const prop of customProps.items) {
          prop.load("key,value");
        }
        await context.sync();

        // Check for HermesManaged property
        for (const prop of customProps.items) {
          if (prop.key === "HermesManaged" && prop.value === "true") {
            console.log("Document is marked as Hermes-managed");
            return true;
          }
        }

        return false;
      });
    } catch (error) {
      console.error("Error checking HermesManaged property:", error);
      return false;
    }
  }

  /**
   * Renders a table in the document by updating its headers.
   *
   * This asynchronous method calls the `updateDocumentHeaders` function of the `docService`
   * with the current document. If an error occurs during the update, it logs the error
   * message to the console.
   *
   * @returns {Promise<void>} A promise that resolves when the table rendering is complete.
   */
  async renderTable() {
    try {
      // Enrich document with project details if projects exist
      const enrichedDocument = { ...this.document };

      if (this.document.projects && this.document.projects.length > 0) {
        try {
          const projectDetails = await this.hermesClient.getProjectsByIds(this.document.projects);
          enrichedDocument.projectDetails = projectDetails.map(project => ({
            id: project.id,
            title: project.title
          }));
        } catch (error) {
          console.log("Error loading project details for header:", error);
          // Continue without project details - will show IDs instead
        }
      }

      // Add base URL for project hyperlinks
      enrichedDocument.baseUrl = this.hermesClient['baseUrl'];

      await this.docService.updateDocumentHeaders(enrichedDocument);
    } catch (error) {
      console.log("Error occured during renderTable: ", error);
    }
  }

  /**
   * Retrieves a mapping of email addresses to their corresponding `Person` objects.
   *
   * Given an array of email addresses, this method fetches detailed information
   * for each email using the `hermesClient` and constructs a `Map` where each key
   * is an email address and the value is the associated `Person` object.
   *
   * @param emails - An array of email addresses to fetch details for.
   * @returns A promise that resolves to a `Map` mapping email addresses to `Person` objects.
   * @throws Logs an error to the console if fetching or mapping fails, but does not throw.
   */
  async getEmailToPersonMap(emails: string[]): Promise<Map<string, Person>> {
    const emailToPersonMap = new Map<string, Person>();
    try {
      const users = await this.hermesClient.getPeopleDetailsFromEmail(emails);
      for (const user of users) {
        emailToPersonMap.set(user.emailAddresses[0].value, user);
      }
    } catch (error) {
      console.log("Error in fetching and mapping email and person", error);
    }
    return emailToPersonMap;
  }

  /**
   * Retrieves a mapping of group email addresses to their corresponding `Group` objects.
   *
   * @param emails - An array of group email addresses to fetch details for.
   * @returns A promise that resolves to a `Map` mapping group email addresses to `Group` objects.
   */
  async getEmailToGroupMap(emails: string[]): Promise<Map<string, Group>> {
    const emailToGroupMap = new Map<string, Group>();

    if (!emails || emails.length === 0) {
      return emailToGroupMap;
    }

    try {
      const groups = await this.hermesClient.getGroupDetailsFromEmail(emails);
      for (const group of groups) {
        if (group?.email) {
          emailToGroupMap.set(group.email, group);
        }
      }
    } catch (error) {
      console.log("Error in fetching and mapping email and group", error);
    }

    return emailToGroupMap;
  }

  /**
   * Generates a complete Hermes URL for a given person by using the URL of their first photo.
   *
   * @param person - The person object containing an array of photos.
   * @returns The complete Hermes URL constructed from the first photo's URL.
   */
  createHermesUrlFromPerson(person: Person) {
    if (!person) return "";
    return this.hermesClient.createCompleteUrl(person.photos[0].url);
  }

  /**
   * Updates the document metadata with the provided payload, synchronizes the local document state,
   * and triggers a mutation and re-render.
   *
   * @param payload - A partial object containing the metadata fields to update.
   * @param mutateDoc - A callback function that receives the updated document metadata.
   * 
   * @remarks
   * This method sends an update request to the backend, fetches the latest document details,
   * merges the updated fields into the local document, invokes the mutation callback,
   * and re-renders the table. Errors during the process are logged to the console.
   */
  async updateMetadata(
    payload: Partial<IDocumentMetadata>,
    mutateDoc: (doc: IDocumentMetadata) => void
  ) {
    try {
      await this.hermesClient.updateDocument({
        fileID: this.document.objectID,
        isDraft: this.document._isDraft,
        updatePayload: payload,
      });
      this.document = await this.hermesClient
        .getDocumentDetails(this.document.objectID)
        .catch((_) => this.document);

      for (const [key, value] of Object.entries(payload)) {
        this.document[key] = value;
      }

      mutateDoc(this.document);
      await this.renderTable();
    } catch (error) {
      console.log("Error occured during updating values", error);
      // Re-throw error so components can handle it
      throw error;
    }
  }

  /**
   * Searches for people matching the specified query string using the Hermes client.
   *
   * @param query - The search string used to find people.
   * @returns A promise that resolves with the search results from the Hermes client.
   */
  async searchPeople(query: string) {
    return await this.hermesClient.searchPeople(query);
  }

  /**
   * Searches for groups matching the specified query string using the Hermes client.
   *
   * @param query - The search string used to find groups.
   * @returns A promise that resolves with the search results from the Hermes client.
   */
  async searchGroups(query: string) {
    return await this.hermesClient.searchGroups(query);
  }

  /**
   * Publishes the current document for review if it is in draft state.
   *
   * This method checks if the document is a draft. If so, it calls the Hermes client to publish the document
   * for review, updates the local document metadata (fetching the latest from the server or updating status locally),
   * applies a mutation to the document metadata via the provided callback, and re-renders the table view.
   * Any errors encountered during the process are logged to the console.
   *
   * @param mutateDoc - A callback function that receives the updated document metadata and applies necessary mutations.
   * @returns A promise that resolves when the operation is complete.
   */
  async publishForReview(mutateDoc: (doc: IDocumentMetadata) => void) {
    try {
      if (this.document._isDraft) {
        const fileID = this.document.objectID;
        await this.hermesClient.publishForReview(this.document.objectID);
        this.document = await this.hermesClient.getDocument(fileID).catch((_) => ({
          ...this.document,
          status: "In Review",
          _isDraft: false,
        }));

        // Load related resources for the newly published document to ensure
        // they are available and properly cached after the draft->published transition
        await this.loadRelatedResources();

        mutateDoc(this.document);
        await this.renderTable();
      }
    } catch (error) {
      console.log("Error occured during publishing for review");
    }
  }

  /**
   * Deletes the current draft document using the Hermes client.
   *
   * Attempts to delete the draft associated with the current document's `objectID`.
   * Logs an error message to the console if the deletion fails.
   *
   * @returns {Promise<void>} A promise that resolves when the draft is deleted.
   */
  async deleteDraft() {
    try {
      await this.hermesClient.deleteDraft(this.document.objectID);
    } catch (error) {
      console.log("deletedDraft failed");
    }
  }

  /**
   * Gets the archived status of the current draft document.
   *
   * @returns A promise that resolves with the archived status.
   */
  async getDraftArchivedStatus(): Promise<{ archived: boolean }> {
    try {
      return await this.hermesClient.getDraftArchivedStatus(this.document.objectID);
    } catch (error) {
      console.error("Error getting archived status:", error);
      throw error;
    }
  }

  /**
   * Sets the archived status of the current draft document.
   *
   * @param archived - The new archived status (true to archive, false to unarchive).
   * @param mutateDoc - A callback function that receives the updated document metadata.
   * @returns A promise that resolves when the status is updated.
   */
  async setDraftArchivedStatus(archived: boolean, mutateDoc: (doc: IDocumentMetadata) => void): Promise<void> {
    try {
      await this.hermesClient.setDraftArchivedStatus(this.document.objectID, archived);
      
      // Update local document metadata
      this.document.archived = archived;
      mutateDoc(this.document);
      
      // Refresh the Word document header to show the archived status
      await this.renderTable();
    } catch (error) {
      console.error("Error setting archived status:", error);
      throw error;
    }
  }

  /**
   * Approves the current document if it is not a draft, the current user is the approver,
   * and the document has not already been approved by the current user.
   *
   * This method performs the following steps:
   * 1. Checks if the document is eligible for approval.
   * 2. Calls the Hermes client to approve the document.
   * 3. Updates the local document metadata, either by fetching the latest data from the server
   *    or by updating the `approvedBy` list locally if the fetch fails.
   * 4. Applies the provided mutation function to the updated document metadata.
   * 5. Renders the updated table view.
   *
   * @param mutateDoc - A function that mutates the document metadata after approval.
   * @returns A promise that resolves when the approval process and UI update are complete.
   */
  async approveDoc(mutateDoc: (doc: IDocumentMetadata) => void): Promise<void> {
    try {
      const isIndividualApprover = this.isCurrentApprover();
      const isGroupApprover = await this.isCurrentGroupApprover();

      if (!this.document._isDraft && (isIndividualApprover || isGroupApprover) && !this.isApprovedByCurrentUser()) {
        const fileID = this.document.objectID;
        await this.hermesClient.approveDocument(fileID);
        this.document = await this.hermesClient.getDocument(fileID).catch(_ => ({
          ...this.document,
          approvedBy: [...(this.document.approvedBy || []), this.currentUser.email],
        }));
        mutateDoc(this.document);
        await this.renderTable();
      }
    } catch (error) {
      console.log("approveDoc has failed with err: ", error)
    }
  }

  /**
   * Determines if the provided email address matches the current user's email.
   *
   * @param email - The email address to compare with the current user's email.
   * @returns `true` if the provided email matches the current user's email, otherwise `false`.
   */
  isMe(email: string) {
    return this.currentUser.email === email;
  }

  /**
   * Checks if the current user is the owner of the document.
   *
   * @returns {boolean} Returns `true` if the current user's email is included in the document's owners list; otherwise, returns `false`.
   */
  isCurrentUserIsOwner() {
    return this.document.owners.includes(this.currentUser?.email || "");
  }

  /**
   * Determines whether the current user is a contributor to the document.
   *
   * @returns {boolean} `true` if the current user's email is included in the document's contributors list; otherwise, `false`.
   */
  isCurrentUserContributor() {
    return this.document.contributors?.includes(this.currentUser?.email || "") || false;
  }

  /**
   * Determines if the current user is an approver for the document.
   *
   * @returns {boolean} `true` if the current user's email is included in the document's approvers list; otherwise, `false`.
   */
  isCurrentApprover() {
    return this.document.approvers?.includes(this.currentUser?.email || "") || false;
  }

  /**
   * Determines whether the current user is eligible to approve via group membership.
   *
   * @returns {Promise<boolean>} `true` if the current user can approve as part of an approver group; otherwise, `false`.
   */
  async isCurrentGroupApprover(): Promise<boolean> {
    if (!this.document.approverGroups || this.document.approverGroups.length === 0) {
      return false;
    }

    try {
      const response = await fetch(
        `${this.hermesClient["baseUrl"]}/api/v2/approvals/${this.document.objectID}`,
        {
          method: "HEAD",
          credentials: "include",
          mode: "cors",
          cache: "no-cache",
        }
      );

      return response.status === 200;
    } catch (error) {
      console.log("Error checking group approver status:", error);
      return false;
    }
  }

  /**
   * Checks if the current user has approved the document.
   *
   * @returns {boolean} `true` if the current user's email is present in the document's `approvedBy` list; otherwise, `false`.
   */
  isApprovedByCurrentUser() {
    return this.document.approvedBy?.includes(this.currentUser.email || "") || false;
  }

  /**
   * Loads related resources for the current document.
   *
   * @returns {Promise<RelatedResourcesResponse>} A promise that resolves to the related resources response.
   * @throws Will throw an error if the document is not loaded or if the API request fails.
   */
  async loadRelatedResources(): Promise<RelatedResourcesResponse> {
    if (!this.document) {
      throw new Error("Document not loaded");
    }

    try {
      const resources = await this.hermesClient.getRelatedResources(
        this.document.objectID,
        this.document._isDraft
      );

      // Ensure resources has the correct structure with empty arrays if null/undefined
      const safeResources: RelatedResourcesResponse = {
        externalLinks: resources?.externalLinks || [],
        hermesDocuments: resources?.hermesDocuments || []
      };

      // Cache the resources in the document metadata
      this.document.relatedResources = safeResources;

      return safeResources;
    } catch (error) {
      console.error("Failed to load related resources:", error);

      // Return empty response instead of throwing to prevent UI crashes
      const emptyResponse: RelatedResourcesResponse = {
        externalLinks: [],
        hermesDocuments: []
      };

      this.document.relatedResources = emptyResponse;
      return emptyResponse;
    }
  }

  /**
   * Adds a new related resource to the document.
   *
   * @param {RelatedResource} resource - The resource to add.
   * @returns {Promise<void>} A promise that resolves when the resource is successfully added.
   * @throws Will throw an error if the document is not loaded or if the API request fails.
   */
  async addRelatedResource(resource: RelatedResource): Promise<void> {
    if (!this.document) {
      throw new Error("Document not loaded");
    }

    try {
      // Always load fresh resources from server to avoid stale cached data,
      // especially important after document state changes (draft -> published)
      const currentResources = await this.loadRelatedResources();

      // Convert to combined array for easier manipulation
      const combinedResources = combineAndSortResources(currentResources);

      // Add new resource with next sort order
      const maxSortOrder = combinedResources.length > 0
        ? Math.max(...combinedResources.map(r => r.sortOrder))
        : 0;

      resource.sortOrder = maxSortOrder + 1;
      combinedResources.push(resource);

      // Convert back to API format and save
      const updateRequest = formatResourcesForUpdate(combinedResources);

      await this.hermesClient.updateRelatedResources(
        this.document.objectID,
        this.document._isDraft,
        updateRequest
      );

      // Reload resources to get server-side updates and update cache
      await this.loadRelatedResources();
    } catch (error) {
      console.error("Failed to add related resource:", error);
      throw error;
    }
  }

  /**
   * Updates an existing related resource.
   *
   * @param {RelatedResource} updatedResource - The updated resource data.
   * @returns {Promise<void>} A promise that resolves when the resource is successfully updated.
   * @throws Will throw an error if the document is not loaded or if the API request fails.
   */
  async updateRelatedResource(updatedResource: RelatedResource): Promise<void> {
    if (!this.document) {
      throw new Error("Document not loaded");
    }

    try {
      // Always load fresh resources from server to avoid stale cached data
      const currentResources = await this.loadRelatedResources();

      // Get current resources and update the specific resource
      const combinedResources = combineAndSortResources(currentResources);

      const resourceIndex = combinedResources.findIndex(
        r => r.sortOrder === updatedResource.sortOrder
      );

      if (resourceIndex === -1) {
        throw new Error("Resource not found");
      }

      combinedResources[resourceIndex] = updatedResource;

      // Convert back to API format and save
      const updateRequest = formatResourcesForUpdate(combinedResources);

      await this.hermesClient.updateRelatedResources(
        this.document.objectID,
        this.document._isDraft,
        updateRequest
      );

      // Reload resources to get server-side updates and update cache
      await this.loadRelatedResources();
    } catch (error) {
      console.error("Failed to update related resource:", error);
      throw error;
    }
  }

  /**
   * Removes a related resource from the document.
   *
   * @param {RelatedResource} resource - The resource to remove.
   * @returns {Promise<void>} A promise that resolves when the resource is successfully removed.
   * @throws Will throw an error if the document is not loaded or if the API request fails.
   */
  async removeRelatedResource(resource: RelatedResource): Promise<void> {
    if (!this.document) {
      throw new Error("Document not loaded");
    }

    try {
      // Always load fresh resources from server to avoid stale cached data
      const currentResources = await this.loadRelatedResources();

      // Get current resources and filter out the resource to remove
      const combinedResources = combineAndSortResources(currentResources);

      const filteredResources = combinedResources.filter(
        r => r.sortOrder !== resource.sortOrder
      );

      // Convert back to API format and save
      const updateRequest = formatResourcesForUpdate(filteredResources);

      await this.hermesClient.updateRelatedResources(
        this.document.objectID,
        this.document._isDraft,
        updateRequest
      );

      // Reload resources to get server-side updates and update cache
      await this.loadRelatedResources();
    } catch (error) {
      console.error("Failed to remove related resource:", error);
      throw error;
    }
  }

  /**
   * Gets the current related resources from the cached document metadata.
   *
   * @returns {RelatedResourcesResponse} The cached related resources or empty response if not loaded.
   */
  getCachedRelatedResources(): RelatedResourcesResponse {
    return this.document?.relatedResources || { externalLinks: [], hermesDocuments: [] };
  }

  /**
   * Searches for documents that can be added as related resources.
   *
   * @param {string} query - The search query string.
   * @returns {Promise<IDocumentMetadata[]>} A promise that resolves to an array of matching documents.
   * @throws Will throw an error if the search fails.
   */
  async searchDocuments(query: string): Promise<IDocumentMetadata[]> {
    try {
      console.log("Searching for documents with query:", query);

      // Use the HermesClient to search for documents
      const results = await this.hermesClient.searchDocuments(query);

      // Filter out the current document from results if it exists
      const filteredResults = results.filter(doc =>
        doc.objectID !== this.document?.objectID
      );

      console.log(`Found ${filteredResults.length} documents for query: ${query}`);
      return filteredResults;
    } catch (error) {
      console.error("Failed to search documents:", error);
      throw error;
    }
  }

  /**
   * Searches for projects using the specified query string.
   * 
   * @param query - The search query string
   * @returns A promise that resolves to an array of matching projects
   */
  async searchProjects(query: string) {
    try {
      console.log("Searching for projects with query:", query);

      // Use the HermesClient to search for projects
      const results = await this.hermesClient.searchProjects(query);

      console.log(`Found ${results.length} projects for query: ${query}`);
      return results;
    } catch (error) {
      console.error("Failed to search projects:", error);
      throw error;
    }
  }

  /**
   * Retrieves all active projects for project selection.
   * 
   * @returns A promise that resolves to an array of active projects
   */
  async getActiveProjects() {
    try {
      console.log("Loading active projects");

      // Use the HermesClient to get active projects
      const results = await this.hermesClient.getActiveProjects();

      console.log(`Found ${results.length} active projects`);
      return results;
    } catch (error) {
      console.error("Failed to load active projects:", error);
      throw error;
    }
  }

  /**
   * Refreshes the document metadata from the server.
   * 
   * @returns A promise that resolves when the document metadata is refreshed
   */
  async refreshDocumentMetadata() {
    try {
      if (!this.document?.objectID) {
        throw new Error("No document available to refresh");
      }

      this.document = await this.hermesClient.getDocumentDetails(this.document.objectID);
      console.log("Document metadata refreshed");
    } catch (error) {
      console.error("Failed to refresh document metadata:", error);
      throw error;
    }
  }

  /**
   * Loads projects associated with the current document.
   * 
   * @returns A promise that resolves to an array of projects associated with the document
   */
  async loadDocumentProjects() {
    try {
      console.log("Loading document projects for:", this.document?.objectID);

      if (!this.document?.projects || this.document.projects.length === 0) {
        console.log("No projects associated with document");
        return [];
      }

      // Get project details for the project IDs in the document metadata
      const results = await this.hermesClient.getProjectsByIds(this.document.projects);

      console.log(`Found ${results.length} projects for document`);
      return results;
    } catch (error) {
      console.error("Failed to load document projects:", error);
      throw error;
    }
  }

  /**
   * Adds the current document to a project.
   * 
   * @param projectId - The ID of the project to add the document to
   * @returns A promise that resolves when the document is added to the project
   */
  async addDocumentToProject(projectId: string) {
    try {
      console.log("Adding document to project:", projectId);

      if (!this.document?.objectID) {
        throw new Error("No document available to add to project");
      }

      await this.hermesClient.addDocumentToProject(this.document.objectID, projectId);

      // Refresh document metadata to get updated projects array
      await this.refreshDocumentMetadata();

      // Update document header to reflect the new project
      await this.renderTable();

      console.log("Successfully added document to project");
    } catch (error) {
      console.error("Failed to add document to project:", error);
      throw error;
    }
  }

  /**
   * Removes the current document from a project.
   * 
   * @param projectId - The ID of the project to remove the document from
   * @returns A promise that resolves when the document is removed from the project
   */
  async removeDocumentFromProject(projectId: string) {
    try {
      console.log("Removing document from project:", projectId);

      if (!this.document?.objectID) {
        throw new Error("No document available to remove from project");
      }

      await this.hermesClient.removeDocumentFromProject(this.document.objectID, projectId);

      // Refresh document metadata to get updated projects array
      await this.refreshDocumentMetadata();

      // Update document header to reflect the project removal
      await this.renderTable();

      console.log("Successfully removed document from project");
    } catch (error) {
      console.error("Failed to remove document from project:", error);
      throw error;
    }
  }
}
