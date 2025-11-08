#!/bin/zsh
# Removes all lines containing {ipodid: from .pro files (case-insensitive)
# Works on macOS default zsh + BSD sed

TARGET_DIR="${1:-.}"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "❌ Error: Directory '$TARGET_DIR' not found."
  exit 1
fi

echo "🔍 Scanning for .pro files in: $TARGET_DIR"

# Loop through all .pro files recursively
find "$TARGET_DIR" -type f -name "*.pro" | while IFS= read -r file; do
  echo "🧹 Cleaning: $file"
  # Make a backup before editing
  cp "$file" "$file.bak"
  # Use BSD sed inline edit (note: '' argument required on macOS)
  sed -i '' '/{[Ii][Pp][Oo][Dd][Ii][Dd]:/d' "$file"
done

echo "✅ Done. Backups created as *.bak"
