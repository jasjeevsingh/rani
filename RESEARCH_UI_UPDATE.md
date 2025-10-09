# Research UI Update - Library Integration & Paper Management

## Summary
Updated the Research View to properly display imported arXiv papers in the library and added functionality to remove papers.

---

## Changes Made

### 1. **Library Display Enhancement**

#### Before:
- Library only showed uploaded PDF documents
- Imported arXiv papers were stored in database but not visible in UI

#### After:
- Library shows both uploaded PDFs AND imported research papers
- Papers display: title, authors, year, venue, import date
- Separate styling for papers vs documents

---

### 2. **Paper Management Features**

#### Added Functionality:
✅ **View Papers** - Click on paper to open PDF (if downloaded) or view online  
✅ **Remove Papers** - Delete button on each paper card  
✅ **Real-time Updates** - Library refreshes after import/delete  
✅ **Proper Metadata** - Shows authors, year, venue for each paper  

---

## File Changes

### Frontend Changes

#### `/src/ui/research/ResearchView.js`
- Added `papers` property to component state
- Created `renderPaperLibraryCard()` method for paper display
- Added `updatePapers()` method to receive paper data
- Added `deletePaper()` method to dispatch delete events
- Added `openPaper()` method to handle opening paper files
- Updated `renderLibrary()` to show both papers and documents
- Updated `.document-item` CSS to support flex layout with delete button

#### `/src/ui/app/PickleGlassApp.js`
- Updated `handleLoadDocuments()` to also call `getUserPapers()`
- Added `handleDeletePaper()` event handler
- Added `handleOpenPaperFile()` event handler
- Connected new events to research-view component

---

### Backend Changes

#### `/src/features/research/researchService.js`
- Added `deletePaper(paperId, userId)` method:
  - Verifies user ownership
  - Deletes PDF file from disk (if exists)
  - Removes record from database
  - Returns success status

#### `/src/features/research/researchFeature.js`
- Added `research:deletePaper` IPC handler
- Added `research:openPaperFile` IPC handler
- Integrated with electron's shell.openPath()

#### `/src/bridge/researchBridge.js`
- Exposed `deletePaper(paperId)` to renderer
- Exposed `openPaperFile(filePath)` to renderer

---

## User Experience Flow

### Importing Papers
1. Search for papers in arXiv
2. Click "Import" on desired paper
3. Paper downloads (if PDF available) and saves to database
4. **Library immediately updates** to show new paper
5. Paper appears with full metadata (title, authors, year, venue)

### Viewing Papers
1. Navigate to "My Library" tab
2. See all imported papers at top of list
3. Click on paper title to open:
   - If PDF downloaded: Opens file in default PDF viewer
   - If no PDF: Opens arXiv URL in browser

### Removing Papers
1. Find paper in library
2. Click "Remove" button
3. Confirmation (implicit via action)
4. Paper deleted from database
5. PDF file deleted from disk (if exists)
6. Library refreshes automatically

---

## Technical Details

### Database Integration
- Papers stored in `research_papers` table
- Includes: title, authors, abstract, year, venue, arxiv_id, file_path
- Tracks import timestamp (`imported_at`)
- User-scoped via `uid` field

### File Management
- Downloaded PDFs stored in `~/.rani/` directory
- Delete operation removes both DB record AND file
- Graceful handling if file doesn't exist

### State Management
- Component maintains separate `documents` and `papers` arrays
- Updates triggered via `updateDocuments()` and `updatePapers()`
- Re-renders automatically when state changes

---

## Testing Checklist

✅ Import paper from search results → Appears in library  
✅ Library shows paper metadata correctly  
✅ Click paper → Opens PDF or URL  
✅ Click "Remove" → Paper disappears from library  
✅ Multiple papers display correctly  
✅ Mixed view (papers + documents) renders properly  
✅ Empty state shows when no items  

---

## Next Steps (Optional Enhancements)

1. **Confirmation Dialog** - Add "Are you sure?" before delete
2. **Bulk Operations** - Select multiple papers to delete
3. **Sorting/Filtering** - Sort by date, author, or venue
4. **Search Within Library** - Find papers by keyword
5. **Export Citations** - Generate BibTeX for selected papers
6. **Tags/Collections** - Organize papers into categories
7. **Reading Progress** - Track which papers have been read
8. **Annotations Integration** - Link highlights to papers

---

## Known Limitations

- No undo after delete (consider implementing)
- Large libraries may need pagination
- No visual feedback during import/delete (consider loading states)
- No conflict resolution if same paper imported twice (prevented by findExistingPaper)

---

## Code Quality

- ✅ Proper error handling throughout
- ✅ Console logging for debugging
- ✅ User ownership verification (security)
- ✅ Graceful degradation if APIs unavailable
- ✅ Consistent naming conventions
- ✅ Well-documented functions

---

**Status**: ✅ **Complete and Tested**

All features implemented and ready for use in the RANI application.
