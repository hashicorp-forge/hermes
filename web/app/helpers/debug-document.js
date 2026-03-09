// This is a temporary debugging helper to check the document model structure
export default function debugDocument(document) {
  if (!document) {
    console.error('Document is undefined');
    return;
  }
  
  console.log('Document keys:', Object.keys(document));
  console.log('Document webUrl:', document.webUrl);
  console.log('Document directEditURL:', document.directEditURL);
  
  if (typeof document === 'object') {
    // Try to log the entire object structure
    try {
      console.log('Full document:', JSON.stringify(document));
    } catch (e) {
      console.log('Could not stringify document:', e);
    }
  }
  
  return '';
}
