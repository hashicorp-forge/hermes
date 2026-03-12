import CurrentUser from "../interfaces/currentUser";
import IDocumentMetadata from "../interfaces/documentMetadata";
import { Person } from "../interfaces/person";
import { Group } from "../interfaces/group";
import IProduct from "../interfaces/products";
import { RelatedResourcesResponse, RelatedResourcesUpdateRequest, RelatedHermesDocument } from "../interfaces/relatedResources";
import { HermesProject, ProjectStatus } from "../interfaces/project";

export const HERMES_AUTH_REQUIRED_EVENT = "hermes-auth-required";

/**
 * `HermesClient` provides a set of methods for interacting with the Hermes API.
 *
 * This client abstracts HTTP requests to various endpoints, enabling retrieval and update of products,
 * documents, drafts, and people metadata. It handles authentication, error reporting, and response parsing.
 * 
 * Authentication is handled via ALB OIDC session cookies. The Storage Access API must be
 * granted before making requests from a third-party iframe context (Office Add-in).
 *
 * @example
 * ```typescript
 * const client = new HermesClient("https://api.example.com");
 * const products = await client.getProducts();
 * ```
 *
 * @remarks
 * - All requests include credentials and expect JSON responses.
 * - Methods throw errors on non-OK responses or network failures.
 *
 * @public
 */
export default class HermesClient {
  constructor(private baseUrl: string) {
    if (this.baseUrl === null || this.baseUrl.length === 0 || typeof this.baseUrl !== "string") {
      this.baseUrl = "";
    }
  }

  /**
   * Creates a standardized error message from a fetch result.
   * @param result - The result object containing error or response information
   * @returns A string describing the error
   */
  private getErrorMessage(result: { error?: { message?: string; status?: number }; response?: Response; success: boolean }): string {
    return result.error?.message || (result.response ? `Status ${result.response.status}` : 'Unknown error');
  }

  private notifyAuthenticationRequired(detail?: unknown): void {
    window.dispatchEvent(
      new CustomEvent(HERMES_AUTH_REQUIRED_EVENT, { detail })
    );
  }

  private isAuthenticationError(input: Response | unknown): boolean {
    if (input instanceof Response) {
      return (
        input.status === 401 ||
        input.status === 302 ||
        input.status === 0 ||
        input.type === "opaqueredirect"
      );
    }

    const error = input as {
      status?: number;
      type?: string;
      message?: string;
      response?: { status?: number; type?: string };
    } | null;

    if (!error) {
      return false;
    }

    if (error.status === 401 || error.status === 302 || error.status === 0) {
      return true;
    }

    if (error.type === "opaqueredirect" || error.response?.type === "opaqueredirect") {
      return true;
    }

    if (error.response?.status === 401 || error.response?.status === 302) {
      return true;
    }

    return Boolean(
      error.message && (
        error.message.includes("401") ||
        error.message.includes("302") ||
        error.message.includes("Authentication required") ||
        error.message.includes("redirect to login") ||
        error.message.includes("opaqueredirect")
      )
    );
  }

  private signalAuthIfNeeded(input: Response | unknown): void {
    if (this.isAuthenticationError(input)) {
      this.notifyAuthenticationRequired(input);
    }
  }

  /**
   * Constructs and returns a default `RequestInit` object for HTTP requests.
   *
   * The returned object includes:
   * - `headers`: Sets the `Accept` header to `application/json` to indicate the expected response format.
   * - `credentials`: Set to `"include"` to ensure cookies (ALB OIDC session) are sent with the request.
   * - `method`: Set to `"GET"` as the default HTTP method.
   * - `mode`: Set to `"cors"` to enable CORS requests.
   *
   * @returns {RequestInit} The default request initialization object for fetch calls.
   */
  private get reqHeader(): RequestInit {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };

    return {
      headers,
      credentials: "include",
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      // Don't follow redirects automatically - ALB OIDC returns 302 to IdP
      // when not authenticated. We need to detect this and show sign-in UI.
      redirect: "manual",
    } as RequestInit;
  }

  /**
   * Creates headers for POST requests with JSON body containing a search query.
   *
   * @param query - The search query to include in the request body.
   * @returns {RequestInit} The request initialization object configured for POST with JSON body.
   */
  private createPostSearchHeaders(query: string): RequestInit {
    const baseHeader = this.reqHeader;
    return {
      ...baseHeader,
      method: "POST",
      body: JSON.stringify({ query }),
      headers: {
        ...(baseHeader.headers || {}),
        "Content-Type": "application/json",
      },
    };
  }

  /**
   * Retrieves a list of products from the API.
   *
   * @returns A promise that resolves to a record mapping product IDs to their corresponding `IProduct` objects.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async getProducts(): Promise<Record<string, IProduct>> {
    try {
      const productEndpoint = `${this.baseUrl}/api/v2/products`;
      const res = await fetch(productEndpoint, this.reqHeader);
      if (res.ok) {
        return await res.json();
      }

      throw new Error(
        `getProducts has failed with status: ${res.status} and body ${await res.text()}`
      );
    } catch (err) {
      console.log("getProducts has failed with err: ", err);
      throw err;
    }
  }

  /**
   * Retrieves the metadata details of a document or draft by its file ID.
   *
   * This method makes parallel requests to both draft and document endpoints to improve performance.
   * Returns the first successful response with an `_isDraft` property indicating the source.
   * If neither is found, it returns `null`.
   *
   * @param fileID - The unique identifier of the document or draft to retrieve.
   * @returns A promise that resolves to the document metadata with an `_isDraft` flag, or `null` if not found.
   * @throws Will throw an error if both fetch operations fail for reasons other than 404 not found.
   */
  public async getDocumentDetails(fileID: string): Promise<IDocumentMetadata> {
    try {
      const draftEndpoint = `${this.baseUrl}/api/v2/drafts/${fileID}`;
      const docEndpoint = `${this.baseUrl}/api/v2/documents/${fileID}`;

      // Helper function to safely fetch and handle errors
      const safeFetch = async (url: string) => {
        try {
          const response = await fetch(url, this.reqHeader);

          // With redirect: 'manual', a 302 becomes an opaqueredirect response
          // This indicates the user needs to authenticate
          if (response.type === 'opaqueredirect' || response.status === 0) {
            return {
              success: false,
              response: null,
              error: { status: 302, message: 'Authentication redirect detected' }
            };
          }

          return { success: true, response, error: null };
        } catch (error) {
          return { success: false, response: null, error };
        }
      };

      // Make both requests in parallel for better performance
      const [draftResult, docResult] = await Promise.all([
        safeFetch(draftEndpoint),
        safeFetch(docEndpoint)
      ]);

      // Check draft response first (preferred)
      if (draftResult.success && draftResult.response && draftResult.response.ok) {
        const body = await draftResult.response.json();
        return {
          ...body,
          _isDraft: true,
        };
      }

      // Check document response if draft failed
      if (docResult.success && docResult.response && docResult.response.ok) {
        const body = await docResult.response.json();
        return {
          ...body,
          _isDraft: false,
        };
      }

      // Both failed - check if they were 404s (not found) vs actual errors
      const draftNotFound = draftResult.success && draftResult.response && draftResult.response.status === 404;
      const docNotFound = docResult.success && docResult.response && docResult.response.status === 404;

      if (draftNotFound && docNotFound) {
        return null; // Document doesn't exist in either location
      }

      // Check if either error is an auth redirect (status 302)
      const draftAuthRedirect = draftResult.error?.status === 302;
      const docAuthRedirect = docResult.error?.status === 302;

      if (draftAuthRedirect || docAuthRedirect) {
        // Throw an error that preserves the status for isAuthenticationError to detect
        const authError = new Error('Authentication required - redirect to login detected');
        (authError as any).status = 302;
        this.signalAuthIfNeeded(authError);
        throw authError;
      }

      // If we got here, there was an actual error (not just 404 or auth redirect)
      const draftError = this.getErrorMessage(draftResult);
      const docError = this.getErrorMessage(docResult);

      throw new Error(`getDocumentDetails failed - Draft: ${draftError}, Doc: ${docError}`);
    } catch (error) {
      console.log("Error in getDocumentDetails: ", error);
      this.signalAuthIfNeeded(error);
      throw error;
    }
  }

  public async getDocument(fileID: string): Promise<IDocumentMetadata> {
    try {
      const draftEndpoint = `${this.baseUrl}/api/v2/documents/${fileID}`;

      let res = await fetch(draftEndpoint, this.reqHeader);

      // Check for auth redirect (opaqueredirect from redirect: 'manual')
      if (res.type === 'opaqueredirect' || res.status === 0) {
        const authError = new Error('Authentication required - redirect to login detected');
        (authError as any).status = 302;
        this.signalAuthIfNeeded(authError);
        throw authError;
      }

      if (res.status === 404) {
        return null;
      }

      if (res.ok) {
        const body = await res.json();
        return {
          ...body,
          _isDraft: false,
        };
      }

      this.signalAuthIfNeeded(res);
      throw new Error(`getDocument failed with status: ${res.status} and body ${await res.text()}`);
    } catch (error) {
      console.log("Error in getDocumentDetails: ", error);
      this.signalAuthIfNeeded(error);
      throw error;
    }
  }

  /**
   * Retrieves details of people based on their email addresses.
   *
   * @param emails - An array of email addresses for which to fetch person details.
   * @returns A promise that resolves to an array of `Person` objects corresponding to the provided emails.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async getPeopleDetailsFromEmail(emails: string[]): Promise<Person[]> {
    try {
      const peopleEndpoint = `${this.baseUrl}/api/v2/people?emails=${emails.join(",")}`;
      const res = await fetch(peopleEndpoint, this.reqHeader);
      if (res.ok) {
        return await res.json();
      }

      this.signalAuthIfNeeded(res);
      throw new Error(
        `getPeopleDetailsFromEmail has failed with status: ${res.status} and body ${await res.text()}`
      );
    } catch (err) {
      console.log("getPeopleDetailsFromEmail has failed with err:", err);
      this.signalAuthIfNeeded(err);
      throw err;
    }
  }

  /**
   * Searches for people matching the provided query string.
   *
   * Sends a POST request to the `/api/v2/people` endpoint with the search query in the request body.
   *
   * @param query - The search string used to find matching people.
   * @returns A promise that resolves to an array of `Person` objects matching the query.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async searchPeople(query: string): Promise<Person[]> {
    try {
      const peopleEndpoint = `${this.baseUrl}/api/v2/people`;
      const header = this.createPostSearchHeaders(query);

      const res = await fetch(peopleEndpoint, header);
      if (res.ok) {
        return await res.json();
      }

      this.signalAuthIfNeeded(res);
      throw new Error(
        `searchPeople has failed with status: ${res.status} and body ${await res.text()}`
      );
    } catch (err) {
      console.log("searchPeople has failed with err: ", err);
      this.signalAuthIfNeeded(err);
      throw err;
    }
  }

  /**
   * Searches for groups matching the provided query string.
   *
   * @param query - The search string used to find matching groups.
   * @returns A promise that resolves to an array of `Group` objects matching the query.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async searchGroups(query: string): Promise<Group[]> {
    try {
      const groupsEndpoint = `${this.baseUrl}/api/v2/groups`;
      const header = this.createPostSearchHeaders(query);

      const res = await fetch(groupsEndpoint, header);
      if (res.ok) {
        return await res.json();
      }

      this.signalAuthIfNeeded(res);
      throw new Error(
        `searchGroups has failed with status: ${res.status} and body ${await res.text()}`
      );
    } catch (err) {
      console.log("searchGroups has failed with err: ", err);
      this.signalAuthIfNeeded(err);
      throw err;
    }
  }

  /**
   * Retrieves details of groups based on their email addresses.
   * Since there's no dedicated endpoint, performs a search for each email and returns matching groups.
   *
   * @param emails - An array of group email addresses.
   * @returns A promise that resolves to an array of `Group` objects.
   */
  public async getGroupDetailsFromEmail(emails: string[]): Promise<Group[]> {
    try {
      if (!emails || emails.length === 0) {
        return [];
      }

      const groupPromises = emails.map((email) => this.searchGroups(email));
      const groupResults = await Promise.all(groupPromises);

      const groups: Group[] = [];
      groupResults.forEach((result, index) => {
        const lookupEmail = emails[index];
        const matchingGroup = (result || []).find((group) => group.email === lookupEmail);
        if (matchingGroup) {
          groups.push(matchingGroup);
        }
      });

      return groups;
    } catch (err) {
      console.log("getGroupDetailsFromEmail has failed with err:", err);
      throw err;
    }
  }

  /**
   * Updates a document or draft on the server with the provided metadata.
   *
   * @param params - The parameters for updating the document.
   * @param params.fileID - The unique identifier of the document or draft to update.
   * @param params.updatePayload - The partial metadata to update on the document.
   * @param params.isDraft - Indicates whether the target is a draft (`true`) or a published document (`false`).
   * @returns A promise that resolves when the update is successful, or rejects with an error if the update fails.
   * @throws Will throw an error if the server responds with a non-OK status or if a network error occurs.
   */
  public async updateDocument({
    fileID,
    updatePayload,
    isDraft,
  }: {
    fileID: string;
    updatePayload: Partial<IDocumentMetadata>;
    isDraft: boolean;
  }): Promise<void> {
    try {
      const header = this.reqHeader;
      header.method = "PATCH";
      header.body = JSON.stringify(updatePayload);
      if (!header.headers) {
        header.headers = {};
      }

      header.headers["Content-Type"] = "application/json";

      const primaryEndpoint = `${this.baseUrl}/api/v2/${isDraft ? "drafts" : "documents"}/${fileID}`;
      let res = await fetch(primaryEndpoint, header);
      if (!res.ok && isDraft && res.status === 404) {
        const publishedEndpoint = `${this.baseUrl}/api/v2/documents/${fileID}`;
        res = await fetch(publishedEndpoint, header);
      }

      if (res.ok) {
        return;
      }

      throw new Error(
        `updateDocument has failed with status: ${res.status} and body ${await res.text()}`
      );
    } catch (err) {
      console.log("updateDocument has failed with err:", err);
      throw err;
    }
  }

  /**
   * Constructs a complete URL by appending the provided path or endpoint to the base URL.
   *
   * @param post - The path or endpoint to append to the base URL.
   * @returns The fully constructed URL as a string.
   */
  public createCompleteUrl(post: string): string {
    return `${this.baseUrl}${post}`;
  }

  /**
   * Publishes a file for review by sending a POST request to the review endpoint.
   *
   * @param fileID - The unique identifier of the file to be published for review.
   * @returns A promise that resolves when the file is successfully published for review.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async publishForReview(fileID: string): Promise<void> {
    try {
      const publishEndpoint = `${this.baseUrl}/api/v2/reviews/${fileID}`;
      const headers = this.reqHeader;
      headers.method = 'POST';

      const res = await fetch(publishEndpoint, headers);
      if (res.ok) {
        return;
      }

      throw new Error(`publishForReview has failed with status: ${res.status} and body ${await res.text()}`);
    } catch (err) {
      console.log("publishForReview has failed with err: ", err);
      throw err;
    }
  }

  /**
   * Deletes a draft with the specified file ID from the server.
   *
   * Sends a DELETE request to the drafts API endpoint. If the request is successful,
   * the function resolves with no value. If the request fails, it throws an error
   * containing the response status and body.
   *
   * @param fileID - The unique identifier of the draft to be deleted.
   * @returns A promise that resolves when the draft is successfully deleted.
   * @throws Will throw an error if the deletion fails or if a network error occurs.
   */
  public async deleteDraft(fileID: string): Promise<void> {
    try {
      const deleteEndpoint = `${this.baseUrl}/api/v2/drafts/${fileID}`;
      const headers = this.reqHeader;
      headers.method = 'DELETE';

      const res = await fetch(deleteEndpoint, headers);
      if (res.ok) {
        return;
      }

      throw new Error(
        `deleteDraft has failed with status: ${res.status} and body ${await res.text()}`
      )
    } catch (err) {
      console.log("deleteDraft has failed with err:", err);
      throw err;
    }
  }

  /**
   * Retrieves the details of the currently authenticated user.
   *
   * Makes a GET request to the `/api/v2/me` endpoint using the configured base URL and request headers.
   * If the request is successful, returns the user details as a `CurrentUser` object.
   * Throws an error if the request fails, including the HTTP status and response body in the error message.
   *
   * @returns {Promise<CurrentUser>} A promise that resolves to the current user's details.
   * @throws {Error} If the request fails or the response is not OK.
   */
  public async getCurrentUserDetails(): Promise<CurrentUser> {
    try {
      const currentUserEndpoint = `${this.baseUrl}/api/v2/me`;
      const headers = this.reqHeader;

      const res = await fetch(currentUserEndpoint, headers);

      // Check for auth redirect (opaqueredirect from redirect: 'manual')
      if (res.type === 'opaqueredirect' || res.status === 0) {
        const authError = new Error('Authentication required - redirect to login detected');
        (authError as any).status = 302;
        throw authError;
      }

      if (res.ok) {
        return await res.json();
      }

      this.signalAuthIfNeeded(res);

      throw new Error(
        `getCurrentUserDetails has failed with status: ${res.status} and body ${await res.text()}`
      )
    } catch (error) {
      console.log("getCurrentUserDetails has failed with err: ", error);
      this.signalAuthIfNeeded(error);
      throw error;
    }
  }


  public async approveDocument(fileID: string): Promise<void> {
    try {
      const approveEndpoints = `${this.baseUrl}/api/v2/approvals/${fileID}`;
      const headers = this.reqHeader;
      headers.method = "POST";

      const res = await fetch(approveEndpoints, headers);
      if (res.ok) {
        return;
      }

      throw new Error(`approveDocument failed withs status: ${res.status} and body ${await res.text()}`);
    } catch (error) {
      console.log("approveDocument has failed with err", error);
      throw error;
    }
  }

  /**
   * Searches for documents using the Hermes API.
   *
   * @param query - The search query string.
   * @returns A promise that resolves to an array of matching documents.
   * @throws Will throw an error if the search fails or the response is not OK.
   */
  public async searchDocuments(query: string): Promise<IDocumentMetadata[]> {
    try {
      // Use Algolia search endpoint like the web app does
      const searchParams = {
        query: query,
        hitsPerPage: 12,
        attributesToRetrieve: [
          'title',
          'product',
          'docNumber',
          'docType',
          'status',
          'owners',
          'summary',
          'createdTime',
          'modifiedTime',
          'objectID',
          'created'
        ]
      };

      const response = await fetch(
        `${this.baseUrl}/1/indexes/docs/query`,
        {
          method: 'POST',
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "include",
          mode: "cors",
          cache: "no-cache",
          body: JSON.stringify(searchParams),
        }
      );

      if (!response.ok) {
        let errorMessage = `Search failed (${response.status})`;

        // Provide specific error messages for common HTTP status codes
        switch (response.status) {
          case 401:
            errorMessage = "Authentication required - please log in";
            break;
          case 403:
            errorMessage = "Access denied - insufficient permissions";
            break;
          case 404:
            errorMessage = "Search service not found";
            break;
          case 429:
            errorMessage = "Too many requests - please try again later";
            break;
          case 500:
            errorMessage = "Server error - please try again later";
            break;
          case 503:
            errorMessage = "Service unavailable - please try again later";
            break;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Convert Algolia response to IDocumentMetadata format
      const documents: IDocumentMetadata[] = (data.hits || []).map((hit: any) => ({
        objectID: hit.objectID,
        title: hit.title || '',
        docType: hit.docType || '',
        docNumber: hit.docNumber || '',
        product: hit.product || '',
        status: hit.status || '',
        owners: hit.owners || [],
        summary: hit.summary || '',
        createdTime: hit.createdTime || 0,
        modifiedTime: hit.modifiedTime || 0,
        created: hit.created || '',
        customEditableFields: {},
        customFields: [],
        _isDraft: false
      }));

      return documents;
    } catch (error) {
      console.error('Error searching documents:', error);
      // Re-throw the error so components can handle it
      throw error;
    }
  }

  /**
   * Searches for active projects based on a query string.
   * 
   * @param query - The search query string.
   * @returns A promise that resolves to an array of matching projects.
   * @throws Will throw an error if the search fails or the response is not OK.
   */
  public async searchProjects(query: string): Promise<HermesProject[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/projects?status=${ProjectStatus.Active}&title=${encodeURIComponent(query)}`,
        {
          ...this.reqHeader,
          method: "GET",
        }
      );

      if (!response.ok) {
        let errorMessage = `Project search failed (${response.status})`;

        switch (response.status) {
          case 401:
            errorMessage = "Authentication required - please log in";
            break;
          case 403:
            errorMessage = "Access denied - insufficient permissions";
            break;
          case 404:
            errorMessage = "Projects service not found";
            break;
          case 500:
            errorMessage = "Server error - please try again later";
            break;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('Error searching projects:', error);
      throw error;
    }
  }

  /**
   * Retrieves all active projects for project selection.
   * 
   * @returns A promise that resolves to an array of active projects.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async getActiveProjects(): Promise<HermesProject[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/projects?status=${ProjectStatus.Active}`,
        {
          ...this.reqHeader,
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load projects: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return data.projects || [];
    } catch (error) {
      console.error('Error loading active projects:', error);
      throw error;
    }
  }

  /**
   * Retrieves related resources for a document or draft.
   *
   * @param fileID - The unique identifier of the document or draft.
   * @param isDraft - Whether the document is a draft (true) or published document (false).
   * @returns A promise that resolves to the related resources response.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async getRelatedResources(fileID: string, isDraft: boolean): Promise<RelatedResourcesResponse> {
    try {
      const endpoint = `${this.baseUrl}/api/v2/${isDraft ? "drafts" : "documents"}/${fileID}/related-resources`;
      const headers = this.reqHeader;

      const res = await fetch(endpoint, headers);
      if (res.ok) {
        return await res.json();
      }

      // Return empty response for 404 (no related resources found)
      if (res.status === 404) {
        return {
          externalLinks: [],
          hermesDocuments: []
        };
      }

      // Provide specific error messages for common HTTP status codes
      let errorMessage = `Failed to load related resources (${res.status})`;
      switch (res.status) {
        case 401:
          errorMessage = "Authentication required - please log in";
          break;
        case 403:
          errorMessage = "Access denied - you don't have permission to view this document";
          break;
        case 500:
          errorMessage = "Server error - please try again later";
          break;
      }

      throw new Error(errorMessage);
    } catch (error) {
      console.log("getRelatedResources has failed with err:", error);
      throw error;
    }
  }

  /**
   * Updates related resources for a document or draft.
   *
   * @param fileID - The unique identifier of the document or draft.
   * @param isDraft - Whether the document is a draft (true) or published document (false).
   * @param resources - The related resources to update.
   * @returns A promise that resolves when the update is successful.
   * @throws Will throw an error if the request fails or the response is not OK.
   */
  public async updateRelatedResources(
    fileID: string,
    isDraft: boolean,
    resources: RelatedResourcesUpdateRequest
  ): Promise<void> {
    try {
      const endpoint = `${this.baseUrl}/api/v2/${isDraft ? "drafts" : "documents"}/${fileID}/related-resources`;
      const headers = {
        ...this.reqHeader,
        method: "PUT",
        headers: {
          ...(this.reqHeader.headers || {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resources),
      };

      const res = await fetch(endpoint, headers);
      if (res.ok) {
        return;
      }

      // Provide specific error messages for common HTTP status codes
      let errorMessage = `Failed to update related resources (${res.status})`;
      switch (res.status) {
        case 401:
          errorMessage = "Authentication required - please log in";
          break;
        case 403:
          errorMessage = "Access denied - only document owners can edit related resources";
          break;
        case 400:
          errorMessage = "Invalid data - please check your input";
          break;
        case 404:
          errorMessage = "Document not found";
          break;
        case 500:
          errorMessage = "Server error - please try again later";
          break;
      }

      throw new Error(errorMessage);
    } catch (error) {
      console.log("updateRelatedResources has failed with err:", error);
      throw error;
    }
  }

  /**
   * Retrieves project details for the given project IDs.
   * 
   * @param projectIds - Array of project IDs to get details for
   * @returns A promise that resolves to an array of project details
   */
  public async getProjectsByIds(projectIds: number[]): Promise<HermesProject[]> {
    if (!projectIds || projectIds.length === 0) {
      return [];
    }

    try {
      // Fetch each project individually since there's no bulk endpoint
      const projectPromises = projectIds.map(async (projectId) => {
        const response = await fetch(
          `${this.baseUrl}/api/v2/projects/${projectId}`,
          {
            ...this.reqHeader,
            method: "GET",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(`Project ${projectId} not found`);
            return null;
          }
          throw new Error(`Failed to load project ${projectId}: ${response.status}`);
        }

        return await response.json();
      });

      const results = await Promise.all(projectPromises);
      return results.filter((project): project is HermesProject => project !== null);
    } catch (error) {
      console.error('Error loading projects by IDs:', error);
      throw error;
    }
  }

  /**
   * Retrieves related resources for a project.
   * 
   * @param projectId - The project ID to get related resources for
   * @returns A promise that resolves to the project's related resources
   */
  public async getProjectRelatedResources(projectId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v2/projects/${projectId}/related-resources`,
        {
          ...this.reqHeader,
          method: "GET",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { hermesDocuments: [], externalLinks: [] };
        }
        throw new Error(`Failed to load project related resources: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error loading project related resources:', error);
      throw error;
    }
  }

  /**
   * Gets the archived status of a draft document.
   * 
   * @param fileID - The document ID to check
   * @returns A promise that resolves with the archived status
   */
  public async getDraftArchivedStatus(fileID: string): Promise<{ archived: boolean }> {
    try {
      const endpoint = `${this.baseUrl}/api/v2/drafts/${fileID}/archived`;
      const response = await fetch(endpoint, this.reqHeader);
      
      if (!response.ok) {
        throw new Error(`Failed to get archived status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting archived status:', error);
      throw error;
    }
  }

  /**
   * Sets the archived status of a draft document.
   * 
   * @param fileID - The document ID to update
   * @param archived - The new archived status (true to archive, false to unarchive)
   * @returns A promise that resolves when the status is updated
   */
  public async setDraftArchivedStatus(fileID: string, archived: boolean): Promise<void> {
    try {
      const endpoint = `${this.baseUrl}/api/v2/drafts/${fileID}/archived`;
      const response = await fetch(endpoint, {
        ...this.reqHeader,
        method: 'PATCH',
        body: JSON.stringify({ archived }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update archived status: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error setting archived status:', error);
      throw error;
    }
  }

  /**
   * Adds a document to a project by updating the project's related resources.
   * 
   * @param documentId - The document ID to add to the project
   * @param projectId - The project ID to add the document to
   * @returns A promise that resolves when the document is added to the project
   */
  public async addDocumentToProject(documentId: string, projectId: string): Promise<void> {
    try {
      // First, get current related resources
      const currentResources = await this.getProjectRelatedResources(projectId);

      // Check if document is already in the project
      const existingDoc = currentResources.hermesDocuments?.find((doc: any) => doc.FileID === documentId);
      if (existingDoc) {
        console.log('Document is already associated with this project');
        return;
      }

      // Add the document to the project's related resources
      // Transform existing documents to only include FileID and sortOrder
      const existingDocs = (currentResources.hermesDocuments || []).map((doc: any) => ({
        FileID: doc.FileID,
        sortOrder: doc.sortOrder
      }));

      // Calculate next sort order by finding the maximum existing sort order across ALL resources
      const allExistingSortOrders = [
        ...existingDocs.map(doc => doc.sortOrder),
        ...(currentResources.externalLinks || []).map((link: any) => link.sortOrder)
      ];

      const maxSortOrder = allExistingSortOrders.length > 0
        ? Math.max(...allExistingSortOrders)
        : 0;

      const updatedHermesDocuments = [
        ...existingDocs,
        {
          FileID: documentId,
          sortOrder: maxSortOrder + 1
        }
      ];

      const response = await fetch(
        `${this.baseUrl}/api/v2/projects/${projectId}/related-resources`,
        {
          ...this.reqHeader,
          method: "PUT",
          body: JSON.stringify({
            hermesDocuments: updatedHermesDocuments,
            externalLinks: currentResources.externalLinks || []
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to add document to project (${response.status})`;

        switch (response.status) {
          case 401:
            errorMessage = "Authentication required - please log in";
            break;
          case 403:
            errorMessage = "Access denied - insufficient permissions";
            break;
          case 404:
            errorMessage = "Document or project not found";
            break;
          case 500:
            errorMessage = "Server error - please try again later";
            break;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error adding document to project:', error);
      throw error;
    }
  }

  /**
   * Removes a document from a project by updating the project's related resources.
   * 
   * @param documentId - The document ID to remove from the project
   * @param projectId - The project ID to remove the document from
   * @returns A promise that resolves when the document is removed from the project
   */
  public async removeDocumentFromProject(documentId: string, projectId: string): Promise<void> {
    try {
      // First, get current related resources
      const currentResources = await this.getProjectRelatedResources(projectId);

      // Filter out the document to remove and transform to only include FileID and sortOrder
      const updatedHermesDocuments = (currentResources.hermesDocuments || [])
        .filter((doc: any) => doc.FileID !== documentId)
        .map((doc: any) => ({
          FileID: doc.FileID,
          sortOrder: doc.sortOrder
        }));

      // Check if document was actually removed
      if (updatedHermesDocuments.length === (currentResources.hermesDocuments?.length || 0)) {
        console.log('Document was not found in project - nothing to remove');
        return;
      }

      const response = await fetch(
        `${this.baseUrl}/api/v2/projects/${projectId}/related-resources`,
        {
          ...this.reqHeader,
          method: "PUT",
          body: JSON.stringify({
            hermesDocuments: updatedHermesDocuments,
            externalLinks: currentResources.externalLinks || []
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = `Failed to remove document from project (${response.status})`;

        switch (response.status) {
          case 401:
            errorMessage = "Authentication required - please log in";
            break;
          case 403:
            errorMessage = "Access denied - insufficient permissions";
            break;
          case 404:
            errorMessage = "Document or project not found";
            break;
          case 500:
            errorMessage = "Server error - please try again later";
            break;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error removing document from project:', error);
      throw error;
    }
  }
}
