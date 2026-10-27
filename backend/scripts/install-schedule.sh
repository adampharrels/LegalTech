#!/bin/bash
# Installs a launchd agent that runs the pipeline every day at 7am. If the Mac
# is asleep at 7am, launchd runs it once when it wakes. Remove it with
# scripts/remove-schedule.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

LABEL="com.legaltech.pipeline"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT="$(pwd)/scripts/run-pipeline.sh"
mkdir -p logs "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$SCRIPT</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>7</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>$(pwd)/logs/launchd.log</string>
  <key>StandardErrorPath</key><string>$(pwd)/logs/launchd.log</string>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Scheduled daily at 7:00. Plist: $PLIST"
echo "Log: $(pwd)/logs/pipeline.log"
