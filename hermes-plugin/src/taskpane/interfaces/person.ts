export interface Person {
  emailAddresses: EmailAddress[];
  etag: string;
  names: Name[];
  photos: Photo[];
  resourceName: string;
}

export interface EmailAddress {
  metadata: Metadata;
  value: string;
}

export interface Name {
  displayName: string;
  displayNameLastFirst: string;
  familyName: string;
  givenName: string;
  metadata: Metadata;
  unstructuredName: string;
}

export interface Photo {
  default: boolean;
  metadata: Metadata;
  url: string;
}

export interface Metadata {
  primary: boolean;
  source: Source;
  sourcePrimary?: boolean;
  verified?: boolean;
}

export interface Source {
  id: string;
  type: string;
}