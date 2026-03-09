import type {
  RelatedExternalLink,
  RelatedHermesDocument,
} from "hermes/components/related-resources";

export default function updateRelatedResourcesSortOrder(
  hermesDocuments: RelatedHermesDocument[],
  externalLinks: RelatedExternalLink[],
) {
  hermesDocuments.forEach((doc, index) => {
    doc.sortOrder = index + 1;
  });

  externalLinks.forEach((link, index) => {
    link.sortOrder = index + 1 + hermesDocuments.length;
  });
}
