#!/bin/bash

# Safari Cookie Extractor with Auto-Open Finder
set -e

echo "=== Safari Cookie Extractor ==="

# Build tool
if [ ! -f "burnt-cookie/target/release/burntcookie" ]; then
    echo "Building burnt-cookie..."
    [ ! -d "burnt-cookie" ] && git clone https://github.com/horrorho/burnt-cookie.git
    cd burnt-cookie && cargo build --release && cd ..
fi

# Find cookie file
COOKIE_PATHS=(
    "$HOME/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies"
    "$HOME/Library/Cookies/Cookies.binarycookies"
)

FOUND_PATH=""
for path in "${COOKIE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        FOUND_PATH="$path"
        break
    fi
done

if [ -z "$FOUND_PATH" ]; then
    echo "❌ No Safari cookie file found."
    exit 1
fi

COOKIE_FILENAME=$(basename "$FOUND_PATH")
COOKIE_DIR=$(dirname "$FOUND_PATH")
CURRENT_DIR=$(pwd)

echo "📍 Cookie file location: $FOUND_PATH"
echo "📁 Current directory: $CURRENT_DIR"
echo ""

# Offer to open Finder
read -p "Do you want to open Finder to the cookie location? (Y/n) " open_finder
case $open_finder in
    [Yy]* | "" )
        echo "Opening Finder..."
        open "$COOKIE_DIR"
        ;;
esac

echo ""
echo "📋 Please:"
echo "1. Copy '$COOKIE_FILENAME' from the Finder window"
echo "2. Paste it in this folder: $CURRENT_DIR"
echo ""

# Wait for file to appear
while true; do
    read -p "Have you copied '$COOKIE_FILENAME' to this folder? (Y/n) " answer
    
    case $answer in
        [Yy]* | "" )
            if [ -f "$COOKIE_FILENAME" ]; then
                echo "✅ File found! Extracting cookies..."
                break
            else
                echo "❌ File not found. Please copy '$COOKIE_FILENAME' to:"
                echo "   $CURRENT_DIR"
            fi
            ;;
        [Nn]* )
            echo "Please copy the file and then press Y."
            ;;
        * )
            echo "Please answer Y or N."
            ;;
    esac
done

# Extract cookies
./burnt-cookie/target/release/burntcookie "$COOKIE_FILENAME" > cookies.txt

if [ -s "cookies.txt" ]; then
    echo "✅ Success! Created cookies.txt"
    
    # NEW: Filter to keep only YouTube cookies
    echo "🔍 Filtering for YouTube cookies only..."
    
    # Create a temporary file with only YouTube cookies
    grep -E "(youtube\.com|^#)" cookies.txt > cookies_youtube.txt
    
    # Count cookies before and after
    TOTAL_COOKIES=$(grep -c -v "^#" cookies.txt 2>/dev/null || echo "0")
    YOUTUBE_COOKIES=$(grep -c -v "^#" cookies_youtube.txt 2>/dev/null || echo "0")
    
    # Replace original with filtered version
    mv cookies_youtube.txt cookies.txt
    
    echo "📊 Kept $YOUTUBE_COOKIES YouTube cookies (from $TOTAL_COOKIES total cookies)"
    
    # Clean up
    read -p "Remove the copied '$COOKIE_FILENAME'? (Y/n) " cleanup
    case $cleanup in
        [Yy]* | "" ) rm -f "$COOKIE_FILENAME" ;;
    esac
    
    echo "🎉 Done! Use: yt-dlp --cookies cookies.txt [URL]"
else
    echo "❌ Extraction failed"
    exit 1
fi