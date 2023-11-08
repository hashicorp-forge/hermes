import { RelatedHermesDocument } from "hermes/components/related-resources";
import { HermesDocument } from "hermes/types/document";

export default function formatRelatedHermesDocument(
  document: HermesDocument,
): RelatedHermesDocument {
  const { title, status, owners, ownerPhotos, product } = document;
  const documentType = document.docType;
  const documentNumber = document.docNumber;
  const googleFileID = document.objectID;

  // is the assumption that this will be run in conjunction with a sort function?
  const sortOrder = 1;

  return {
    title,
    status,
    owners,
    ownerPhotos,
    product,
    documentType,
    documentNumber,
    googleFileID,
    sortOrder,
  };
}
