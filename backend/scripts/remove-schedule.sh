#!/bin/bash
# Removes the daily pipeline schedule installed by scripts/install-schedule.sh.
set -u
LABEL="com.legaltech.pipeline"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "Removed the daily pipeline schedule."
