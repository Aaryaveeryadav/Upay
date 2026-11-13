# Discoverable Save question controls

AI answer actions had no Save control, despite the Saved page being available.
The local-answer Save control opened a tagging menu, making this inconsistent.

AI answers now have a visible one-tap Save question button below the question;
local answers, practice cards and PYQ cards also expose the same affordance.
Clicking saves the question to the existing owner-scoped Saved collection, shows
Saved with a check, disables the button and gives a confirmation directing the
student to Saved. No whole-page redraw means saving does not reset test answers
or jump the viewport. Repeated saves via this control are deduplicated by text.
Existing remote-sync behavior and tagging/removal in Saved are unchanged.

Instructions: tap Save question → see Saved/check → open Saved from navigation
(the mobile Me destination contains this section). Guests retain their list in
this browser/device; account syncing still depends on the existing service.
Saved questions do not imply stored/officially verified AI answer keys.

save_question_browser.js tests actual AI-answer, practice and PYQ controls,
disabled Saved state, guest reload persistence and Saved listing, no scroll jump
and Hindi labels at 1280/390px. AI is mocked; remote account syncing is not
certified by this test. Cache 26c4. No question-bank or source-figure edits.
