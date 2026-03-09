/**
 * Represents an external link resource related to a document
 */
export interface RelatedExternalLink {
  name: string;
  url: string;
  sortOrder: number;
}

/**
 * Represents a Hermes document resource related to another document
 */
export interface RelatedHermesDocument {
  FileID: string;
  title: string;
  documentType: string;
  documentNumber: string;
  sortOrder: number;
  createdTime?: number;
  modifiedTime: number;
  product: string;
  status: string;
  owners: string[];
  summary?: string;
}

/**
 * Union type for all related resource types
 */
export type RelatedResource = RelatedExternalLink | RelatedHermesDocument;

/**
 * Response structure from the API when fetching related resources
 */
export interface RelatedResourcesResponse {
  externalLinks: RelatedExternalLink[];
  hermesDocuments: RelatedHermesDocument[];
}

/**
 * Request structure for updating related resources via API
 */
export interface RelatedResourcesUpdateRequest {
  externalLinks: Partial<RelatedExternalLink>[];
  hermesDocuments: Partial<RelatedHermesDocument>[];
}

/**
 * Helper type guards to distinguish between resource types
 */
export const isExternalLink = (resource: RelatedResource): resource is RelatedExternalLink => {
  return 'url' in resource && 'name' in resource;
};

export const isHermesDocument = (resource: RelatedResource): resource is RelatedHermesDocument => {
  return 'FileID' in resource && 'title' in resource;
};

/**
 * Utility function to combine and sort related resources
 */
export const combineAndSortResources = (response: RelatedResourcesResponse): RelatedResource[] => {
  const combined: RelatedResource[] = [
    ...(response.externalLinks || []),
    ...(response.hermesDocuments || [])
  ];
  
  return combined.sort((a, b) => a.sortOrder - b.sortOrder);
};

/**
 * Utility function to format resources for API update
 */
export const formatResourcesForUpdate = (resources: RelatedResource[] = []): RelatedResourcesUpdateRequest => {
  const externalLinks: Partial<RelatedExternalLink>[] = [];
  const hermesDocuments: Partial<RelatedHermesDocument>[] = [];

  resources.forEach(resource => {
    if (isExternalLink(resource)) {
      externalLinks.push({
        name: resource.name,
        url: resource.url,
        sortOrder: resource.sortOrder
      });
    } else if (isHermesDocument(resource)) {
      hermesDocuments.push({
        FileID: resource.FileID,
        sortOrder: resource.sortOrder
      });
    }
  });

  return { externalLinks, hermesDocuments };
};