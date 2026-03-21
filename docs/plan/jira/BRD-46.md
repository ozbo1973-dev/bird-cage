# BRD-46 - Improve Photo UX with Drag and Drop

Add drag-and-drop functionality for photo uploads in bird forms to improve user experience alongside the existing file input.

## Implementation Steps

1. Create a `DragDropZone` client component that wraps the photo upload area.
   - Accept `onDrop` callback and optional `accept` file type string.
   - Implement `dragover`, `dragleave`, and `drop` event handlers using native HTML5 API.
   - Display visual feedback (border highlight, background color) when files are dragged over the zone.
   - Validate dropped files match accepted types and file size constraints before passing to callback.

2. Update `AddBirdForm` to use the `DragDropZone` component around the photo upload section.
   - Pass the existing file input's `onChange` handler as the `onDrop` callback.
   - Programmatically set the file input value when files are dropped.
   - Ensure the file input remains visible and functional as a fallback option.

3. Update `BirdEditForm` to use the `DragDropZone` component around the photo upload section.
   - Apply the same pattern as `AddBirdForm`.
   - Maintain backward compatibility with the existing file input.

4. Update `EventForm` to use the `DragDropZone` component for inline bird photo uploads.
   - Apply drag-and-drop to each inline bird card's photo section.

5. Add unit tests for `DragDropZone` component.
   - Test `dragover`, `dragleave`, and `drop` events trigger correctly.
   - Test visual feedback classes are applied and removed appropriately.
   - Test file validation (type, size) in the onDrop callback.
   - Test that non-file drag items (e.g., text) are rejected.

6. Add integration tests for photo uploads via drag-and-drop in forms.
   - Test dropping a valid image file onto a form's drag-drop zone.
   - Test that the photo upload proceeds through the existing flow.
   - Test that dropping an invalid file shows no side effects.

7. Manual testing on the forms.
   - Verify drag-and-drop works in `AddBirdForm`, `BirdEditForm`, and `EventForm`.
   - Verify visual feedback appears during drag-over.
   - Verify file input remains usable as a fallback.
   - Test with various file types and sizes.

## Acceptance Criteria

- [ ] `DragDropZone` component created with drag-over visual feedback (e.g., border highlight with Accent Yellow `#ecad0a`)
- [ ] Drop zone accepts image files and rejects invalid types
- [ ] File size validation implemented (reuse existing constraints from file input)
- [ ] `AddBirdForm`, `BirdEditForm`, and `EventForm` updated to use drag-drop zone
- [ ] File input remains visible and functional as fallback
- [ ] Unit tests added for `DragDropZone` (all event handlers, validation, visual states)
- [ ] Integration tests added for form photo uploads via drag-and-drop
- [ ] No external dependencies added (native HTML5 drag-and-drop API only)
- [ ] All 44+ existing unit tests still pass
