---
slug: 'close-duplicate-chrome-tabs'
title: 'Close duplicate Chrome tabs with AppleScript'
date: '2026-04-30T12:00:00.000Z'
---

I don't love installing a browser extension with broad tab permissions just to do one tiny thing.

This AppleScript closes duplicate Chrome tabs across all windows. It keeps the first tab it sees for each URL and closes the later duplicates.

Save it in Script Editor, run it with `osascript`, or <a href="/close-duplicate-chrome-tabs.applescript" download>download the script</a>.

```applescript
#!/usr/bin/osascript

say "starting tab cleanup"

set seenURLs to {}
set duplicateTabs to {}

tell application "Google Chrome"
	activate

	-- Find duplicate tabs across all windows
	repeat with windowIndex from 1 to (count of windows)
		set windowId to id of window windowIndex
		set tabCount to count of tabs of window windowIndex

		repeat with tabIndex from 1 to tabCount
			set currentURL to URL of tab tabIndex of window windowIndex

			if currentURL is missing value then
				set currentURL to ""
			else
				set currentURL to currentURL as string
			end if

			if currentURL is not "" then
				if seenURLs contains currentURL then
					copy {windowId, tabIndex} to end of duplicateTabs
				else
					copy currentURL to end of seenURLs
				end if
			end if
		end repeat
	end repeat

	-- Close duplicates from highest tab index to lowest per window
	set closedTabCount to 0

	repeat with windowIndex from 1 to (count of windows)
		set windowId to id of window windowIndex

		repeat with duplicateIndex from (count of duplicateTabs) to 1 by -1
			set duplicateEntry to item duplicateIndex of duplicateTabs

			if item 1 of duplicateEntry is windowId then
				set tabIndex to item 2 of duplicateEntry

				try
					close tab tabIndex of window id windowId
					set closedTabCount to closedTabCount + 1
				end try
			end if
		end repeat
	end repeat
end tell

if closedTabCount > 0 then
	say closedTabCount
	say "tabs closed"
else
	say "no duplicate tabs found"
end if

say "finished tab cleanup"
```

macOS may ask for Automation permission the first time so the script can control Chrome.
