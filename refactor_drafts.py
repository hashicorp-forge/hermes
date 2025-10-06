#!/usr/bin/env python3
"""
Script to refactor drafts.go to use provider abstractions.
"""

import re
import sys

def refactor_drafts(content):
    """Apply all refactoring transformations to drafts.go content."""
    
    # Add context declarations at the start of each handler
    # For DraftsHandler
    content = re.sub(
        r'(func DraftsHandler\([^{]+\{[\s\n]+return http\.HandlerFunc\(func\(w http\.ResponseWriter, r \*http\.Request\) \{)',
        r'\1\n\t\tctx := r.Context()',
        content
    )
    
    # For DraftsDocumentHandler
    content = re.sub(
        r'(func DraftsDocumentHandler\([^{]+\{[\s\n]+return http\.HandlerFunc\(func\(w http\.ResponseWriter, r \*http\.Request\) \{)',
        r'\1\n\t\tctx := r.Context()',
        content
    )
    
    # Replace Algolia read operations: ar.Drafts.GetObject -> searchProvider.DraftIndex().GetObject
    content = re.sub(
        r'\bar\.Drafts\.GetObject\(([^,]+),\s*(&\w+)\)',
        r'searchProvider.DraftIndex().GetObject(ctx, \1, \2)',
        content
    )
    
    # Replace Algolia write operations: aw.Drafts.SaveObject -> searchProvider.DraftIndex().Index
    # This is trickier because we need to convert the object to search.Document
    content = re.sub(
        r'res, err := aw\.Drafts\.SaveObject\((\w+)\)',
        r'searchDoc := mapToSearchDocument(\1)\n\t\t\tres, err := searchProvider.DraftIndex().Index(ctx, searchDoc)',
        content
    )
    
    # Replace Algolia delete operations: aw.Drafts.DeleteObject -> searchProvider.DraftIndex().Delete
    content = re.sub(
        r'res, err := aw\.Drafts\.DeleteObject\(([^)]+)\)',
        r'res, err := searchProvider.DraftIndex().Delete(ctx, \1)',
        content
    )
    
    # Replace Algolia search operations
    # ar.DraftsCreatedTimeAsc.Search -> use searchProvider.DraftIndex().Search with sort parameter
    content = re.sub(
        r'resp, err = ar\.DraftsCreatedTimeAsc\.Search\("",\s*params\.\.\.\)',
        r'resp, err = searchProvider.DraftIndex().Search(ctx, "", params...)',
        content
    )
    
    content = re.sub(
        r'resp, err = ar\.DraftsCreatedTimeDesc\.Search\("",\s*params\.\.\.\)',
        r'resp, err = searchProvider.DraftIndex().Search(ctx, "", params...)',
        content
    )
    
    # Replace workspace operations: s. -> workspaceProvider.
    workspace_methods = [
        'GetFile', 'MoveFile', 'CopyFile', 'ShareFile', 'DeleteFile',
        'SearchPeople', 'RenameFile', 'CreateFolder', 'GetSubfolder',
        'CreateShortcut', 'GetLatestRevision', 'KeepRevisionForever'
    ]
    
    for method in workspace_methods:
        content = re.sub(
            rf'\bs\.{method}\(',
            f'workspaceProvider.{method}(',
            content
        )
    
    # Replace gw.NewAdapter(s) -> workspaceProvider (it's already the provider)
    content = re.sub(
        r'provider := gw\.NewAdapter\(s\)',
        r'provider := workspaceProvider',
        content
    )
    
    content = re.sub(
        r'provider = gw\.NewAdapter\(s\)',
        r'provider = workspaceProvider',
        content
    )
    
    # Replace copyTemplateSvc := *s with appropriate workspace provider usage
    # This is a special case where they copy the service - we'll need to use the provider directly
    content = re.sub(
        r'copyTemplateSvc := \*s',
        r'copyTemplateSvc := workspaceProvider',
        content
    )
    
    # Replace errs.IsAlgoliaErrWithCode(err, 404) -> errors.Is(err, pkgsearch.ErrNotFound)
    content = re.sub(
        r'if _, is404 := errs\.IsAlgoliaErrWithCode\(err, 404\); is404 \{',
        r'if errors.Is(err, pkgsearch.ErrNotFound) {',
        content
    )
    
    # Replace opt. and search. references - these need to be removed or replaced
    # For search params, we need to keep the opt. calls but they may not compile
    # Let's document that search params need manual review
    
    return content

def main():
    input_file = '/Users/jrepp/hc/hermes/internal/api/drafts.go'
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    refactored = refactor_drafts(content)
    
    with open(input_file, 'w') as f:
        f.write(refactored)
    
    print(f"Refactored {input_file}")
    print("Note: Search parameters using opt. and search.QueryRes may need manual review")

if __name__ == '__main__':
    main()
