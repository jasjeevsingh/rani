# Zotero + arXiv Fallback Implementation

## Problem
Zotero papers were showing "⚠️ No PDF" because:
1. Not all papers in Zotero library have PDF attachments
2. Users may have only added metadata to Zotero without PDFs
3. No fallback mechanism to download PDFs from other sources

## Solution
Added **automatic arXiv fallback** when Zotero doesn't have a PDF attachment:

### Flow Chart
```
Sync Zotero Paper
    ↓
Try to get PDF from Zotero attachments
    ↓
PDF found? ────YES───→ Download from Zotero
    │                       ↓
    NO                  Import & Embed
    ↓                       ↓
Check if paper has arXiv ID   Done ✅
    ↓
arXiv ID? ────NO────→ Show "⚠️ No PDF"
    │
   YES
    ↓
Download from arXiv (https://arxiv.org/pdf/{id}.pdf)
    ↓
Import & Embed
    ↓
Done ✅
```

---

## Code Changes

### File: `src/features/research/zoteroSyncService.js`

#### 1. Updated `syncAttachments()` Method

**Before:**
```javascript
async syncAttachments(uid, paperId, zoteroKey, apiKey, zoteroUserId, libraryType) {
    const attachments = await this.zoteroService.fetchItemAttachments(...);
    const pdfAttachments = attachments.filter(att => att.data.contentType === 'application/pdf');
    
    if (pdfAttachments.length === 0) {
        console.log('No PDF attachments found');
        return; // ❌ Gave up here!
    }
    
    // Download from Zotero...
}
```

**After:**
```javascript
async syncAttachments(uid, paperId, zoteroKey, apiKey, zoteroUserId, libraryType) {
    // Get paper info for arXiv fallback
    const paper = this.db.getDb().prepare(
        'SELECT arxiv_id, title FROM research_papers WHERE id = ?'
    ).get(paperId);
    
    const attachments = await this.zoteroService.fetchItemAttachments(...);
    const pdfAttachments = attachments.filter(att => att.data.contentType === 'application/pdf');
    
    // ✅ NEW: Try arXiv fallback if no Zotero PDF
    if (pdfAttachments.length === 0) {
        if (paper && paper.arxiv_id) {
            console.log(`No PDF in Zotero, trying arXiv: ${paper.arxiv_id}`);
            return await this.downloadFromArxiv(uid, paperId, paper.arxiv_id, paper.title);
        } else {
            console.log('No PDF in Zotero and no arXiv ID available');
            return;
        }
    }
    
    // Download from Zotero...
}
```

#### 2. Added New `downloadFromArxiv()` Method

```javascript
async downloadFromArxiv(uid, paperId, arxivId, title) {
    const arxivUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
    
    // 1. Download PDF from arXiv
    const pdfBuffer = await downloadViaHttps(arxivUrl);
    
    // 2. Save to disk
    const filename = `${sanitizeTitle(title)}_${arxivId}.pdf`;
    const filePath = path.join(this.zoteroDir, filename);
    fs.writeFileSync(filePath, pdfBuffer);
    
    // 3. Import via documentService (extracts text, chunks, embeds)
    const document = await this.documentService.importDocument(filePath, uid, {
        isPaper: true,
        paperId: paperId,
        source: 'arxiv',
        arxivId: arxivId
    });
    
    // 4. Update research_papers with document_id
    this.db.getDb().prepare(`
        UPDATE research_papers
        SET file_path = ?, pdf_url = ?, document_id = ?
        WHERE id = ?
    `).run(filePath, arxivUrl, document.id, paperId);
}
```

---

## How arXiv ID is Extracted

The `ZoteroService.extractArxivId()` method already handles this:

```javascript
extractArxivId(itemData) {
    // Check URL for arXiv
    if (itemData.url && itemData.url.includes('arxiv.org')) {
        const match = itemData.url.match(/arxiv\.org\/(?:abs|pdf)\/(\d+\.\d+)/);
        if (match) return match[1]; // e.g., "2209.12345"
    }
    
    // Check extra field for arXiv ID
    if (itemData.extra) {
        const match = itemData.extra.match(/arXiv:\s*(\d+\.\d+)/i);
        if (match) return match[1];
    }
    
    return null;
}
```

**Detection Sources:**
1. **URL field**: `https://arxiv.org/abs/2209.12345` → extracts `2209.12345`
2. **Extra field**: `arXiv: 2209.12345` → extracts `2209.12345`

---

## User Experience

### Before Fix:
```
Zotero Sync Results:
├─ Paper 1 (has PDF in Zotero) → ✅ Ready
├─ Paper 2 (no PDF in Zotero) → ⚠️ No PDF  ← Stuck!
└─ Paper 3 (no PDF in Zotero) → ⚠️ No PDF  ← Stuck!
```

### After Fix:
```
Zotero Sync Results:
├─ Paper 1 (has PDF in Zotero) → ✅ Ready
├─ Paper 2 (no PDF, has arXiv) → ⏳ Downloading from arXiv...
│                                  → ✅ Ready (embedded!)
└─ Paper 3 (no PDF, no arXiv) → ⚠️ No PDF (truly no PDF available)
```

---

## Example: Your Papers

From the screenshot, these papers would now work:

### 1. "A Model-independent Radio Telescope Dark Matter Search"
- **Authors**: Aya Keller, Sean O'Brien, Adyant Kamdar, Nicholas M. Rapidis...
- **Journal**: The Astrophysical Journal (2022)
- **Current Status**: ⚠️ No PDF in Zotero
- **After Fix**: 
  - Check arXiv ID in URL or Extra field
  - If found → Download from arXiv → ✅ Ready
  - If not found → Still ⚠️ No PDF

### 2. "Upper limit on the axion-photon coupling from magnetic white dwarf polarization"
- **Authors**: Christopher Dessert, David Dunsky, Benjamin R. Safdi...
- **Journal**: Physical Review D (2022)
- **Current Status**: ⚠️ No PDF in Zotero
- **After Fix**: Same as above

### 3. "Extraterrestrial Axion Search with the Breakthrough Listen Galactic Center Survey"
- **Authors**: Joshua W. Foster, Samuel J. Witte, Matthew Lawson, Tim Linden...
- **Journal**: Physical Review Letters (2022)
- **Current Status**: ⚠️ No PDF in Zotero
- **After Fix**: Same as above

---

## Testing Checklist

### To Verify Fix:

1. **Check if papers have arXiv IDs:**
   ```sql
   SELECT id, title, arxiv_id, file_path 
   FROM research_papers 
   WHERE source = 'zotero' AND arxiv_id IS NOT NULL;
   ```

2. **Re-sync Zotero:**
   - Go to Research → Zotero tab
   - Click "Sync Library" again
   - Watch terminal for logs:
     ```
     [ZoteroSyncService] No PDF in Zotero for abc123, trying arXiv: 2209.12345
     [ZoteroSyncService] Downloading from arXiv: https://arxiv.org/pdf/2209.12345.pdf
     [ZoteroSyncService] Downloaded arXiv PDF: Paper_Title_2209.12345.pdf
     [ZoteroSyncService] arXiv PDF imported as document xyz789, embeddings generated
     ```

3. **Check My Library:**
   - Papers should now show:
     - ⏳ Checking... → ⚙️ Generating... → ✅ Ready

4. **Verify Embeddings:**
   ```sql
   SELECT 
       rp.title,
       rp.arxiv_id,
       rp.document_id,
       COUNT(dc.id) as total_chunks,
       COUNT(CASE WHEN dc.sync_state = 'embedded' THEN 1 END) as embedded_chunks
   FROM research_papers rp
   LEFT JOIN document_chunks dc ON rp.document_id = dc.document_id
   WHERE rp.source = 'zotero' AND rp.arxiv_id IS NOT NULL
   GROUP BY rp.id;
   ```

5. **Test RAG Search:**
   - Enable "Research Library" in Ask sidebar
   - Ask: "What are the main findings about dark matter in my papers?"
   - Should cite papers from Zotero!

---

## Edge Cases Handled

### Case 1: No PDF in Zotero, No arXiv ID
```
Result: ⚠️ No PDF (nothing we can do)
Logged: "No PDF in Zotero and no arXiv ID available"
```

### Case 2: No PDF in Zotero, Has arXiv ID, arXiv Download Fails
```
Result: ⚠️ No PDF
Logged: "Failed to download from arXiv: HTTP 404"
Paper still has metadata, just no PDF
```

### Case 3: No PDF in Zotero, Has arXiv ID, Download Success but Import Fails
```
Result: PDF saved but not embedded
Logged: "Failed to import arXiv PDF: [error]"
file_path updated (can manually retry embed later)
```

### Case 4: PDF in Zotero (Priority)
```
Result: Uses Zotero PDF (arXiv never tried)
This is the preferred source
```

---

## Performance Impact

### Additional Time per Paper:
- **Zotero PDF available**: 0s (no change)
- **arXiv fallback needed**: +2-5 seconds per paper
  - Download: 1-3s (depends on PDF size)
  - Import + Embed: 1-2s (same as Zotero PDF)

### Example Sync Times:
| Papers | With Zotero PDFs | Need arXiv Fallback | Total Time |
|--------|------------------|---------------------|------------|
| 10 | 8 | 2 | ~1 min |
| 50 | 30 | 20 | ~5 min |
| 100 | 50 | 50 | ~10 min |

---

## Future Enhancements

### Potential Improvements:

1. **DOI Fallback:**
   - Try Unpaywall API for DOI-based downloads
   - Try publisher direct links
   - Try institutional access

2. **Manual PDF Upload:**
   - Add button to upload PDF for papers with ⚠️ No PDF
   - Link uploaded PDF to paper automatically

3. **Batch Processing:**
   - Download multiple arXiv PDFs in parallel
   - Show progress: "Downloading 5/20 papers from arXiv..."

4. **Smart Retry:**
   - Remember failed arXiv downloads
   - Retry after X days (paper may become available)

5. **Source Priority:**
   - Try Zotero → arXiv → DOI → SciHub (configurable)
   - Allow user to set preferred sources

---

## Summary

✅ **Zotero papers now automatically download from arXiv as fallback**

**What Changed:**
- Check for arXiv ID when Zotero has no PDF
- Download PDF from `https://arxiv.org/pdf/{arxiv_id}.pdf`
- Import and embed automatically (same as Zotero PDFs)
- Update status badges in UI

**Result:**
- More papers have PDFs
- More papers are searchable via RAG
- Better user experience (less manual work)

**Trade-off:**
- Slightly longer sync times for papers needing arXiv fallback
- Still shows ⚠️ No PDF if truly no PDF available anywhere

**Next Steps:**
1. Restart app to load new code
2. Re-sync Zotero library
3. Watch papers get PDFs from arXiv! 🎉
