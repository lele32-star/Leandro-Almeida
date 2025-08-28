#!/bin/bash
# Verification script for vendored pdfMake

echo "=== Vendored pdfMake Verification ==="
echo

# Check if vendor files exist
echo "1. Checking vendor files exist:"
if [ -f "vendor/pdfmake/pdfmake.min.js" ]; then
    echo "✅ pdfmake.min.js found ($(du -h vendor/pdfmake/pdfmake.min.js | cut -f1))"
else
    echo "❌ pdfmake.min.js not found"
    exit 1
fi

if [ -f "vendor/pdfmake/vfs_fonts.js" ]; then
    echo "✅ vfs_fonts.js found ($(du -h vendor/pdfmake/vfs_fonts.js | cut -f1))"
else
    echo "❌ vfs_fonts.js not found"
    exit 1
fi

echo

# Check HTML files use vendor references
echo "2. Checking HTML files use vendor references:"
VENDOR_REFS=$(grep -l "vendor/pdfmake" *.html | wc -l)
CDN_REFS=$(grep -l "cdnjs.*pdfmake" *.html | wc -l)

echo "✅ HTML files using vendor pdfMake: $VENDOR_REFS"
if [ "$CDN_REFS" -eq "0" ]; then
    echo "✅ No CDN references found"
else
    echo "❌ CDN references still found: $CDN_REFS"
    grep -n "cdnjs.*pdfmake" *.html
    exit 1
fi

echo

# Check that files are tracked in git
echo "3. Checking vendor files are tracked in git:"
if git ls-files vendor/pdfmake/pdfmake.min.js | grep -q pdfmake.min.js; then
    echo "✅ pdfmake.min.js is tracked in git"
else
    echo "❌ pdfmake.min.js is not tracked in git"
    exit 1
fi

if git ls-files vendor/pdfmake/vfs_fonts.js | grep -q vfs_fonts.js; then
    echo "✅ vfs_fonts.js is tracked in git"
else
    echo "❌ vfs_fonts.js is not tracked in git"
    exit 1
fi

echo
echo "=== All checks passed! pdfMake is successfully vendored for offline/CI use ==="