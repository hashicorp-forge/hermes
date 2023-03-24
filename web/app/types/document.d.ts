/**
 * NOTE: This is a partial type definition.
 * We are defining it incrementally as we expand TS coverage.
 */
export interface HermesDocument {
  readonly objectID: string;

  status: string;
  product?: string;
  modifiedAgo: string;
  modifiedTime: number;
  docNumber: string;
  docType: string;
  title: string;
  isDraft?: boolean;

  thumbnail?: string;
  _snippetResult?: {
    content: {
      value: string;
    };
  };
}

export interface HermesUser {
  email: string;
  imgURL?: string | null;
}
