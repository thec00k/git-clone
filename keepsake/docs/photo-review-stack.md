# Batch photo review and scrapbook waiting pile

Completed: 2026-10-03. Uses the approved Illustrated Nostalgia direction: warm paper, quiet shadows, small rotations, photographs as the focus.

Device uploads in the archive, folder imports, and the scrapbook photo chooser open a swipeable review stack. Arrow buttons and keyboard navigation provide alternatives to swiping. Users can choose a destination scrapbook, keep a photograph in the archive, undo a choice, view the batch as a grid, or queue the entire batch. Finish, the close button, and Escape save the chosen destinations.

Every upload is stored in the archive first. A scrapbook's optional `pendingPhotoIds` contains only archive references. Opening that scrapbook shows the waiting stack beside the pages. Placement uses the selected non-title page and respects the six-photo limit. Placement removes the reference from the waiting stack in the same undoable operation; Undo restores it. Returning a waiting photo to the archive removes only its waiting reference. Other books and room themes do not affect this queue. Room backups validate and preserve it.

The stack mounts at most three images and uses CSS transforms. Motion reduces when the system requests it. Mobile stacks start collapsed. No new animation dependency or Three.js geometry is introduced.

Validation: production build; targeted lint (zero warnings/errors); photo inbox checks for deduplication, unchanged pages before placement, placement references, page capacity/title-page rejection, undo snapshots, backup round-trip and missing-reference rejection; existing memory/backup checks. In-browser verification covered review, queueing, placement, Undo, closing the book, full reload, and reopening with the waiting stack intact. Existing repository lint warnings and build chunk-size warnings remain.
