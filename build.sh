#!/bin/bash

# Firefox Extension Build Script
# This script prepares the extension for development or production
# Usage: ./build.sh [dev|prod] [--clean]

# Extension details
EXTENSION_NAME="grayscale-focus"
VERSION="${VERSION:-0.1.0}"  # Use environment variable or default to 0.1.0

# Parse arguments
BUILD_MODE="dev"
CLEAN_BUILD=false

for arg in "$@"; do
    case $arg in
        prod|production)
            BUILD_MODE="prod"
            ;;
        dev|development)
            BUILD_MODE="dev"
            ;;
        --clean|-c|clean)
            CLEAN_BUILD=true
            ;;
        --help|-h|help)
            echo "🔧 Grayscale Focus Extension Build Script"
            echo ""
            echo "Usage: ./build.sh [mode] [options]"
            echo ""
            echo "Modes:"
            echo "  dev, development  Build for development (default)"
            echo "  prod, production  Build for production with zip package"
            echo ""
            echo "Options:"
            echo "  --clean, -c       Clean previous builds first"
            echo "  --help, -h        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./build.sh                  # Development build"
            echo "  ./build.sh prod             # Production build"
            echo "  ./build.sh --clean          # Clean development build"
            echo "  ./build.sh prod --clean     # Clean production build"
            exit 0
            ;;
    esac
done

echo "🔧 Building Grayscale Focus Extension..."

# Set output directory and package name
if [ "$BUILD_MODE" = "prod" ]; then
    echo "🚀 Building for PRODUCTION..."
    OUTPUT_DIR="dist"
    PACKAGE_NAME="${EXTENSION_NAME}-v${VERSION}"
else
    echo "🛠️  Building for DEVELOPMENT..."
    OUTPUT_DIR="build"
    PACKAGE_NAME="${EXTENSION_NAME}-dev"
fi

# Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
    echo "🧹 Cleaning previous builds..."
    rm -rf build dist *.zip
fi

# Clean and create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Ensure PNG icons exist
echo "🎨 Ensuring PNG icons exist..."
cd src/assets/icons || exit
if [ ! -f "icon-16.png" ] || [ ! -f "icon-32.png" ] || [ ! -f "icon-48.png" ] || [ ! -f "icon-128.png" ]; then
    echo "� Creating PNG icons from SVG..."
    if [ -f "create_pngs.py" ]; then
        python3 create_pngs.py
    else
        echo "⚠️  Warning: create_pngs.py not found. PNG icons may be missing."
    fi
fi
cd - > /dev/null || exit

echo "📁 Copying files to $OUTPUT_DIR..."

# Copy and update manifest with current version
echo "🔧 Updating manifest version to $VERSION..."
if command -v jq >/dev/null 2>&1; then
    jq --arg version "$VERSION" '.version = $version' manifest.json > "$OUTPUT_DIR/manifest.json"
    echo "✅ Manifest version updated to $VERSION"
else
    echo "⚠️  Warning: jq not found. Copying manifest without version update."
    cp manifest.json "$OUTPUT_DIR/"
fi

# Copy source files
cp -r src "$OUTPUT_DIR/"

# Update tests package.json version if it exists
if [ -f "tests/package.json" ] && command -v jq >/dev/null 2>&1; then
    echo "🔧 Updating tests/package.json version to $VERSION..."
    jq --arg version "$VERSION" '.version = $version' tests/package.json > tests/package.json.tmp
    mv tests/package.json.tmp tests/package.json
    echo "✅ Tests package.json version updated"
fi

echo "✅ Build complete!"
echo "📂 Files are in: $OUTPUT_DIR/"

# Show icon status
echo ""
echo "🔍 Icon files available:"
ls -la "$OUTPUT_DIR/src/assets/icons/"*.png 2>/dev/null || echo "❌ No PNG icons found"

if [ "$BUILD_MODE" = "prod" ]; then
    echo ""
    echo "📦 Creating distribution package..."

    # Create zip for distribution
    cd "$OUTPUT_DIR" || exit
    zip -r "../${PACKAGE_NAME}.zip" . -x "*.DS_Store" "*/__pycache__/*"
    cd .. || exit

    echo "✅ Distribution package created: ${PACKAGE_NAME}.zip"

    # Display package contents
    echo ""
    echo "📄 Package contents:"
    unzip -l "${PACKAGE_NAME}.zip" | head -20

    # Show file size
    if command -v ls >/dev/null 2>&1; then
        PACKAGE_SIZE=$(ls -lh "${PACKAGE_NAME}.zip" | awk '{print $5}')
        echo ""
        echo "📦 Package size: $PACKAGE_SIZE"
    fi

    echo ""
    echo "🌐 Ready for Mozilla Add-ons submission!"
    echo ""
    echo "📋 Production Checklist:"
    echo "   ✅ Extension files built"
    echo "   ✅ ZIP package created"
    echo "   ⬜ Test extension functionality"
    echo "   ⬜ Verify all icons display correctly"
    echo "   ⬜ Check wildcard domain support"
    echo "   ⬜ Test on different websites"
    echo "   ⬜ Test timer and focus features"
    echo "   ⬜ Verify stats tracking works"
    echo ""
    echo "🚀 Mozilla Add-ons Submission Steps:"
    echo "   1. 🌐 Go to https://addons.mozilla.org/developers/"
    echo "   2. 📤 Upload ${PACKAGE_NAME}.zip"
    echo "   3. 📝 Fill out the listing information:"
    echo "      • Name: Grayscale Focus"
    echo "      • Summary: Advanced focus extension with wildcard whitelisting"
    echo "      • Description: Include wildcard domain features"
    echo "   4. 🎉 Submit for review (1-14 days)"
    echo ""
    echo "🎯 Your advanced extension with wildcard domain support is ready!"
else
    echo ""
    echo "🎯 Next steps for development:"
    echo "   1. Go to about:debugging in Firefox"
    echo "   2. Remove any old version of the extension"
    echo "   3. Load temporary add-on from $OUTPUT_DIR/manifest.json"
    echo "   4. Check that icons appear correctly in:"
    echo "      - Toolbar (next to address bar)"
    echo "      - Extensions menu (puzzle piece icon menu)"
    echo "      - about:addons page"
    echo "      - about:debugging page"
    echo ""
    echo "🧪 Test the new wildcard domain feature:"
    echo "   • Add *.atlassian.net to whitelist"
    echo "   • Visit confluence.atlassian.net (should be unaffected)"
    echo "   • Visit other sites (should have grayscale)"
fi
