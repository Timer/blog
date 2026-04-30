---
slug: 'close-duplicate-chrome-tabs'
title: 'Close duplicate Chrome tabs with AppleScript'
date: '2026-04-30T12:00:00.000Z'
---

I don't love installing a browser extension with broad tab permissions just to do one tiny thing.

This AppleScript closes duplicate Chrome tabs across all windows. It keeps the first tab it sees for each URL and closes the later duplicates.

[Open it in Script Editor](applescript://com.apple.scripteditor/?action=new&script=%23%21%2Fusr%2Fbin%2Fosascript%0D%0Dsay%20%22starting%20tab%20cleanup%22%0D%0Dset%20seenURLs%20to%20%7B%7D%0Dset%20duplicateTabs%20to%20%7B%7D%0D%0Dtell%20application%20%22Google%20Chrome%22%0D%09activate%0D%0D%09--%20Find%20duplicate%20tabs%20across%20all%20windows%0D%09repeat%20with%20windowIndex%20from%201%20to%20%28count%20of%20windows%29%0D%09%09set%20windowId%20to%20id%20of%20window%20windowIndex%0D%09%09set%20tabCount%20to%20count%20of%20tabs%20of%20window%20windowIndex%0D%0D%09%09repeat%20with%20tabIndex%20from%201%20to%20tabCount%0D%09%09%09set%20currentURL%20to%20URL%20of%20tab%20tabIndex%20of%20window%20windowIndex%0D%0D%09%09%09if%20currentURL%20is%20missing%20value%20then%0D%09%09%09%09set%20currentURL%20to%20%22%22%0D%09%09%09else%0D%09%09%09%09set%20currentURL%20to%20currentURL%20as%20string%0D%09%09%09end%20if%0D%0D%09%09%09if%20currentURL%20is%20not%20%22%22%20then%0D%09%09%09%09if%20seenURLs%20contains%20currentURL%20then%0D%09%09%09%09%09copy%20%7BwindowId%2C%20tabIndex%7D%20to%20end%20of%20duplicateTabs%0D%09%09%09%09else%0D%09%09%09%09%09copy%20currentURL%20to%20end%20of%20seenURLs%0D%09%09%09%09end%20if%0D%09%09%09end%20if%0D%09%09end%20repeat%0D%09end%20repeat%0D%0D%09--%20Close%20duplicates%20from%20highest%20tab%20index%20to%20lowest%20per%20window%0D%09set%20closedTabCount%20to%200%0D%0D%09repeat%20with%20windowIndex%20from%201%20to%20%28count%20of%20windows%29%0D%09%09set%20windowId%20to%20id%20of%20window%20windowIndex%0D%0D%09%09repeat%20with%20duplicateIndex%20from%20%28count%20of%20duplicateTabs%29%20to%201%20by%20-1%0D%09%09%09set%20duplicateEntry%20to%20item%20duplicateIndex%20of%20duplicateTabs%0D%0D%09%09%09if%20item%201%20of%20duplicateEntry%20is%20windowId%20then%0D%09%09%09%09set%20tabIndex%20to%20item%202%20of%20duplicateEntry%0D%0D%09%09%09%09try%0D%09%09%09%09%09close%20tab%20tabIndex%20of%20window%20id%20windowId%0D%09%09%09%09%09set%20closedTabCount%20to%20closedTabCount%20%2B%201%0D%09%09%09%09end%20try%0D%09%09%09end%20if%0D%09%09end%20repeat%0D%09end%20repeat%0Dend%20tell%0D%0Dif%20closedTabCount%20%3E%200%20then%0D%09say%20closedTabCount%0D%09say%20%22tabs%20closed%22%0Delse%0D%09say%20%22no%20duplicate%20tabs%20found%22%0Dend%20if%0D%0Dsay%20%22finished%20tab%20cleanup%22%0D), <a href="/close-duplicate-chrome-tabs.applescript" download>download the script</a>, or copy/paste it below.

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
