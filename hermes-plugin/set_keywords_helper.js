/**
 * Helper function to set document keywords using Word's JavaScript API
 * This should be called from within the Word add-in context
 */

function setDocumentKeywords(keywords) {
    return new Promise((resolve, reject) => {
        Word.run(async (context) => {
            try {
                // Set keywords using Word's API
                context.document.properties.keywords = keywords;
                
                // Sync the changes
                await context.sync();
                
                console.log('[SUCCESS] Keywords set via Word API:', keywords);
                resolve(true);
            } catch (error) {
                console.error('[ERROR] Failed to set keywords via Word API:', error);
                reject(error);
            }
        });
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { setDocumentKeywords };
}