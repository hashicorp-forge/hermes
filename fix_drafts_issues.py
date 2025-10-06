#!/usr/bin/env python3
"""
Script to fix remaining issues in drafts.go refactoring.
"""

import re

def fix_drafts_issues(content):
    """Fix remaining compilation issues."""
    
    # 1. Fix imports - remove errs, add errors
    content = re.sub(
        r'\t"github\.com/algolia/algoliasearch-client-go/v3/algolia/errs"\n',
        '',
        content
    )
    
    content = re.sub(
        r'(import \(\n\t"context"\n)',
        r'\1\t"errors"\n',
        content
    )
    
    # 2. Fix GetObject calls - they return (*search.Document, error) and don't take a pointer param
    # Pattern: err = searchProvider.DraftIndex().GetObject(ctx, docId, &algoDoc)
    # Should be: algoDoc, err := searchProvider.DraftIndex().GetObject(ctx, docId)
    # Then we need to convert to map: algoObj, err := searchDocumentToMap(algoDoc)
    
    content = re.sub(
        r'err = searchProvider\.DraftIndex\(\)\.GetObject\(ctx, ([^,]+), &(\w+)\)',
        r'\2Doc, err := searchProvider.DraftIndex().GetObject(ctx, \1)\n\t\tif err != nil {\n\t\t\tl.Error("error getting draft from search", "error", err, "doc_id", \1)\n\t\t\thttp.Error(w, "Error getting document draft", http.StatusInternalServerError)\n\t\t\treturn\n\t\t}\n\t\t\2, err := searchDocumentToMap(\2Doc)',
        content
    )
    
    # 3. Fix SaveObject/Index calls - need to convert doc to map first, then to search.Document
    # Pattern: searchDoc := mapToSearchDocument(doc) where doc is *document.Document
    # Should be: docObj, err := doc.ToAlgoliaObject(true); then searchDoc, err := mapToSearchDocument(docObj)
    
    content = re.sub(
        r'searchDoc := mapToSearchDocument\(doc\)\n\t\t\tres, err := searchProvider\.DraftIndex\(\)\.Index\(ctx, searchDoc\)',
        r'docObj, err := doc.ToAlgoliaObject(true)\n\t\t\tif err != nil {\n\t\t\t\tl.Error("error converting doc to Algolia object", "error", err)\n\t\t\t\thttp.Error(w, "Error creating document draft", http.StatusInternalServerError)\n\t\t\t\treturn\n\t\t\t}\n\t\t\tsearchDoc, err := mapToSearchDocument(docObj)\n\t\t\tif err != nil {\n\t\t\t\tl.Error("error converting to search document", "error", err)\n\t\t\t\thttp.Error(w, "Error creating document draft", http.StatusInternalServerError)\n\t\t\t\treturn\n\t\t\t}\n\t\t\terr = searchProvider.DraftIndex().Index(ctx, searchDoc)',
        content
    )
    
    # Pattern: searchDoc := mapToSearchDocument(docObj) where docObj is map[string]any
    # This is correct but Index returns error not res, err
    content = re.sub(
        r'searchDoc := mapToSearchDocument\(docObj\)\n\t\t\tres, err := searchProvider\.DraftIndex\(\)\.Index\(ctx, searchDoc\)',
        r'searchDoc, err := mapToSearchDocument(docObj)\n\t\t\tif err != nil {\n\t\t\t\tl.Error("error converting to search document", "error", err)\n\t\t\t\thttp.Error(w, "Error updating document draft", http.StatusInternalServerError)\n\t\t\t\treturn\n\t\t\t}\n\t\t\terr = searchProvider.DraftIndex().Index(ctx, searchDoc)',
        content
    )
    
    # 4. Fix Delete calls - they return error not res, err
    content = re.sub(
        r'res, err := searchProvider\.DraftIndex\(\)\.Delete\(ctx, ([^)]+)\)\n([^\n]+)\n([^\n]+err = res\.Wait\(\))',
        r'err = searchProvider.DraftIndex().Delete(ctx, \1)',
        content
    )
    
    # 5. Fix removeSharing function signature
    content = re.sub(
        r'func removeSharing\(s \*gw\.Service, docId, email string\) error \{',
        r'func removeSharing(workspaceProvider workspace.Provider, docId, email string) error {',
        content
    )
    
    # 6. Fix removeSharing call
    content = re.sub(
        r'if err := removeSharing\(s, docId, c\); err != nil \{',
        r'if err := removeSharing(workspaceProvider, docId, c); err != nil {',
        content
    )
    
    # 7. Fix draftsShareableHandler call - need to pass providers not old params
    content = re.sub(
        r'draftsShareableHandler\(w, r, docId, \*doc, \*cfg, l, ar, s, db\)',
        r'draftsShareableHandler(w, r, docId, *doc, *cfg, l, searchProvider, workspaceProvider, db)',
        content
    )
    
    # 8. Fix draftsShareableHandler signature
    content = re.sub(
        r'func draftsShareableHandler\(\n([^\)]+)\n\tar \*algolia\.Client,\n\ts \*gw\.Service,',
        r'func draftsShareableHandler(\n\1\n\tsearchProvider pkgsearch.Provider,\n\tworkspaceProvider workspace.Provider,',
        content
    )
    
    # 9. Fix copyTemplateSvc - can't dereference workspace.Provider, just use it directly
    content = re.sub(
        r'copyTemplateSvc := workspaceProvider',
        r'// Use the workspace provider directly for template operations',
        content
    )
    
    # Remove the Drive service creation that follows (it won't work with provider interface)
    content = re.sub(
        r'\n\t\t\t\t// Use the workspace provider directly for template operations\n\t\t\t\tcopyTemplateSvc\.Drive, err = drive\.NewService\(\n\t\t\t\t\tcontext\.Background\(\),\n\t\t\t\t\toption\.WithHTTPClient\(jwtConf\.Client\(context\.Background\(\)\)\),\n\t\t\t\t\)\n\t\t\t\tif err != nil \{\n\t\t\t\t\tl\.Error\("error creating service for copying template file",\n\t\t\t\t\t\t"error", err,\n\t\t\t\t\t\t"doc_id", f\.Id,\n\t\t\t\t\t\)\n\t\t\t\t\thttp\.Error\(w, "Error creating document draft",\n\t\t\t\t\t\thttp\.StatusInternalServerError\)\n\t\t\t\t\treturn\n\t\t\t\t\}',
        '',
        content
    )
    
    # 10. Fix Search calls - these need to use SearchQuery instead of opt params
    # This is complex - for now just comment them out with a TODO
    content = re.sub(
        r'(var resp search\.QueryRes.*?\n.*?\n.*?resp, err = searchProvider\.DraftIndex\(\)\.Search\(ctx, "", params\.\.\.\))',
        r'// TODO: Convert to SearchQuery pattern\n\t\t\t// \1',
        content,
        flags=re.DOTALL
    )
    
    return content

def main():
    input_file = '/Users/jrepp/hc/hermes/internal/api/drafts.go'
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    fixed = fix_drafts_issues(content)
    
    with open(input_file, 'w') as f:
        f.write(fixed)
    
    print(f"Fixed remaining issues in {input_file}")
    print("Note: Search operations with opt params need manual review")

if __name__ == '__main__':
    main()
