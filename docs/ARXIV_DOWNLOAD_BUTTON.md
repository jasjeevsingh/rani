# arXiv Download Button Implementation

## Overview
Separated Zotero sync from arXiv download and embedding operations. Now users manually download PDFs from arXiv via a button when Zotero doesn't have the PDF.

## Architecture

### 3-Step Process
1. **Zotero Sync** → Downloads metadata + PDFs from Zotero (shows "⚠️ No PDF" if missing)
2. **arXiv Download** → Manual button click downloads PDF from arXiv (shows "📄 PDF Available")
3. **Embedding** → Manual button click generates embeddings (shows "✅ Ready")

## Changes Made

### 1. Simplified Zotero Sync (`zoteroSyncService.js`)

**`syncAttachments()` method:**
- ✅ Downloads PDFs from Zotero if available
- ✅ Saves `file_path` and `pdf_url` to database
- ❌ No longer auto-imports or auto-embeds
- ❌ No longer tries arXiv fallback automatically

**`downloadFromArxiv()` method:**
- ✅ Downloads PDF from `https://arxiv.org/pdf/{arxiv_id}.pdf`
- ✅ Saves to disk with sanitized filename
- ✅ Updates database with `file_path` and `pdf_url`
- ❌ No longer auto-imports or auto-embeds

### 2. Added arXiv Download Button (`ResearchView.js`)

**`renderPaperLibraryCard()` method:**
```javascript
// Shows "📥 Download from arXiv" button when:
// 1. Paper has no PDF (status === 'no-document')
// 2. Paper has arXiv ID available
const hasNoPdf = status.status === 'no-document' || (!paper.file_path && !paper.document_id);
const hasArxivId = paper.arxiv_id && paper.arxiv_id.length > 0;
const canDownloadFromArxiv = hasNoPdf && hasArxivId;
```

**Button styling:**
- Red background (`#b31b1b`) to match arXiv branding
- Download icon (📥)
- Only appears when conditions met

**`downloadFromArxiv()` handler:**
- Calls `window.api.research.downloadFromArxiv(paperId)`
- Shows loading state during download
- Refreshes paper list and status after success
- Shows alert on failure

### 3. IPC Bridge Setup

**`researchBridge.js`:**
```javascript
downloadFromArxiv: (paperId) => 
    window.api.invoke('research:downloadFromArxiv', paperId)
```

**`researchFeature.js`:**
```javascript
this.ipc.handle('research:downloadFromArxiv', async (paperId) => {
    const userId = await this.getCurrentUserId();
    const paper = this.db.getDb().prepare(
        'SELECT arxiv_id, title FROM research_papers WHERE id = ? AND uid = ?'
    ).get(paperId, userId);
    
    if (!paper || !paper.arxiv_id) {
        return { success: false, error: 'No arXiv ID available' };
    }
    
    await this.zoteroSyncService.downloadFromArxiv(userId, paperId, paper.arxiv_id, paper.title);
    return { success: true };
});
```

### 4. Fixed Zotero 302 Redirects (`zoteroService.js`)

**`downloadFile()` method:**
- Now handles 301, 302, 303, 307, 308 redirects
- Follows `Location` header recursively (max 5 redirects)
- Logs each redirect for debugging

## User Flow

### Initial State
```
Zotero Sync → Paper imported with metadata
Status: ⚠️ No PDF
```

### After arXiv Download
```
Click "📥 Download from arXiv" button
Status: 📄 PDF Available (shows file size)
```

### After Embedding
```
Click "🔄 Embed" button
Status: ✅ Ready (shows chunk count)
```

## UI States

| Condition | Button Shown | Badge |
|-----------|--------------|-------|
| No PDF + has arXiv ID | "📥 Download from arXiv" | ⚠️ No PDF |
| Has PDF + not embedded | "🔄 Embed" | 📄 PDF Available |
| Embedded | None | ✅ Ready |
| Processing | "⚙️ Processing..." (disabled) | ⚙️ Generating... |

## Database Schema

Papers without PDFs:
```sql
file_path = NULL
pdf_url = NULL
document_id = NULL
arxiv_id = "2201.12345" -- Available for download
```

Papers after arXiv download:
```sql
file_path = "/path/to/Upper_Limit_on_the_QCD_Axion_2201.12345.pdf"
pdf_url = "https://arxiv.org/pdf/2201.12345.pdf"
document_id = NULL -- Not yet embedded
arxiv_id = "2201.12345"
```

Papers after embedding:
```sql
file_path = "/path/to/Upper_Limit_on_the_QCD_Axion_2201.12345.pdf"
pdf_url = "https://arxiv.org/pdf/2201.12345.pdf"
document_id = 42 -- Links to documents table
arxiv_id = "2201.12345"
```

## Testing Steps

1. **Sync Zotero library** with papers that have no PDFs
   - Verify papers show "⚠️ No PDF" badge
   - Verify "📥 Download from arXiv" button appears (if arXiv ID exists)

2. **Click "Download from arXiv" button**
   - Terminal should log: `[ZoteroSyncService] Downloading from arXiv: https://arxiv.org/pdf/2201.12345.pdf`
   - Terminal should log: `[ZoteroSyncService] Downloaded arXiv PDF: ...`
   - Button should disappear after success
   - Badge should change to "📄 PDF Available"

3. **Click "🔄 Embed" button**
   - Terminal should log embedding progress
   - Badge should change to "✅ Ready" when complete
   - Paper becomes searchable via RAG

4. **Edge cases**
   - Papers without arXiv ID → No download button (stays "⚠️ No PDF")
   - Invalid arXiv ID → Alert shown, button remains
   - Network error → Alert shown, status unchanged

## Performance

- **Download speed**: ~1-5 seconds per paper (depends on PDF size)
- **No blocking**: Downloads don't block Zotero sync
- **Parallel downloads**: Could implement (not currently)

## Future Enhancements

1. **Batch download**: "Download All from arXiv" button
2. **Progress indicator**: Show download progress (%)
3. **Retry logic**: Auto-retry failed downloads
4. **DOI fallback**: Try Sci-Hub or Unpaywall if arXiv fails
5. **Cache checking**: Don't re-download if PDF already exists locally
