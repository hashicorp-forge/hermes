#!/bin/bash
# Script to refactor reviews.go systematically

FILE="internal/api/reviews.go"

echo "Starting refactoring of $FILE..."

# Step 1: Add ctx := r.Context() after switch statement
sed -i.bak1 '37 a\
\		ctx := r.Context()\
' "$FILE"

# Step 2: Replace provider := gw.NewAdapter(s) with direct workspaceProvider (first occurrence)
sed -i.bak2 's/provider := gw\.NewAdapter(s)/\/\/ Check if document is locked using workspace provider/' "$FILE"
sed -i.bak3 's/locked, err := hcd\.IsLocked(docID, db, provider, l)/locked, err := hcd.IsLocked(docID, db, workspaceProvider, l)/' "$FILE"

# Step 3: Replace ar.Drafts.GetObject with searchProvider.DraftIndex().GetObject
# This is complex, so we'll handle it separately

echo "Basic replacements complete. Check $FILE for intermediate state."
echo "Backup files created: $FILE.bak1, $FILE.bak2, $FILE.bak3"
