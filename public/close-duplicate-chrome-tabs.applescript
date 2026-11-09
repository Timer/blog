#!/usr/bin/osascript

-- Close duplicate Chrome tabs across all windows.
-- Keeps the first tab seen for each URL and closes the later ones.

on closeDuplicateTabs(windowIds)
	set seenURLs to {}
	set closedTabCount to 0

	tell application "Google Chrome"
		repeat with windowRef in windowIds
			-- A loop variable is a reference to a list item; take the value itself
			set windowId to contents of windowRef

			try
				-- One request per window, not one per tab
				set tabURLs to URL of tabs of window id windowId
				set windowMode to mode of window id windowId
			on error
				-- The window closed after the snapshot was taken
				set tabURLs to {}
				set windowMode to ""
			end try

			-- Find this window's duplicates
			set duplicateIndexes to {}

			repeat with tabIndex from 1 to (count of tabURLs)
				set currentURL to item tabIndex of tabURLs

				if currentURL is not missing value and currentURL is not "" then
					-- Incognito tabs are only duplicates of other incognito tabs
					set urlKey to windowMode & " " & currentURL

					-- AppleScript ignores case when it compares text unless told otherwise
					considering case
						if seenURLs contains urlKey then
							set end of duplicateIndexes to tabIndex
						else
							set end of seenURLs to urlKey
						end if
					end considering
				end if
			end repeat

			-- Close from the highest index down, so the indexes still to close stay valid
			repeat with i from (count of duplicateIndexes) to 1 by -1
				try
					close tab (item i of duplicateIndexes) of window id windowId
					set closedTabCount to closedTabCount + 1
				end try
			end repeat
		end repeat
	end tell

	return closedTabCount
end closeDuplicateTabs

say "starting tab cleanup"

-- Snapshot window IDs first: a window that closes along the way would shift every index after it
tell application "Google Chrome" to set windowIds to id of windows

set closedTabCount to closeDuplicateTabs(windowIds)

if closedTabCount is 1 then
	say "one tab closed"
else if closedTabCount > 1 then
	say (closedTabCount as string) & " tabs closed"
else
	say "no duplicate tabs found"
end if

say "finished tab cleanup"
