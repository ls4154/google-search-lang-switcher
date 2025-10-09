#!/bin/bash

OUTPUT_DIR="release"

# Extract version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "Error: Could not extract version from manifest.json"
    exit 1
fi

echo "Building release v${VERSION}..."

# Create release directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Common files to include in both builds
COMMON_FILES="background.js content.js popup.html popup.js languages.js icon16.png icon48.png icon128.png _locales LICENSE README.md"

# Build Chrome version
CHROME_DIR="${OUTPUT_DIR}/chrome"
CHROME_ZIP="google-search-lang-switcher-v${VERSION}-chrome.zip"
echo "Building Chrome version..."
rm -rf "$CHROME_DIR"
mkdir -p "$CHROME_DIR"
cp -r $COMMON_FILES "$CHROME_DIR/"
cp manifest.json "$CHROME_DIR/"
cd "$CHROME_DIR"
zip -r "../$CHROME_ZIP" .
cd - > /dev/null
echo "✓ Chrome release created: ${OUTPUT_DIR}/$CHROME_ZIP"
echo "  (Dev folder: $CHROME_DIR)"

# Build Firefox version
FIREFOX_DIR="${OUTPUT_DIR}/firefox"
FIREFOX_ZIP="google-search-lang-switcher-v${VERSION}-firefox.zip"
echo "Building Firefox version..."
rm -rf "$FIREFOX_DIR"
mkdir -p "$FIREFOX_DIR"
cp -r $COMMON_FILES "$FIREFOX_DIR/"
cp manifest_firefox.json "$FIREFOX_DIR/manifest.json"
cd "$FIREFOX_DIR"
zip -r "../$FIREFOX_ZIP" .
cd - > /dev/null
echo "✓ Firefox release created: ${OUTPUT_DIR}/$FIREFOX_ZIP"
echo "  (Dev folder: $FIREFOX_DIR)"

echo ""
echo "All releases built successfully!"
echo "Load unpacked: Chrome -> $CHROME_DIR, Firefox -> $FIREFOX_DIR/manifest.json"
