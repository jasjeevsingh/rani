# Zotero Sync PDF Embedding Implementation

## Overview
Fixed Zotero sync to automatically download, import, and embed PDFs from Zotero library into RANI's RAG system. Papers synced from Zotero now show embedding status in the My Library view with the same status badges as manually imported papers.

---

## What Was Missing

### Before Fix:
```javascript
// OLD: Just downloaded PDF and saved file path
fs.writeFileSync(filePath, pdfBuffer);

const query = `
    UPDATE research_papers
    SET file_path = ?, pdf_url = ?
    WHERE id = ?
`;

this.db.getDb().prepare(query).run(filePath, pdfAttachment.data.url, paperId);
```

**Problem:**
- ✅ PDF was downloaded from Zotero
- ✅ File path was saved to `research_papers` table
- ❌ PDF was NOT imported as a document
- ❌ Text was NOT extracted
- ❌ Chunks were NOT created
- ❌ Embeddings were NOT generated
- ❌ No RAG search capability for Zotero papers!

---

## What Was Fixed

### After Fix:
```javascript
// NEW: Download, import as document, and generate embeddings
fs.writeFileSync(filePath, pdfBuffer);

// Import PDF through documentService (triggers full pipeline)
document = await this.documentService.importDocument(filePath, uid, {
    isPaper: true,
    paperId: paperId,
    source: 'zotero',
    zoteroKey: zoteroKey
});

// Update research_papers with document_id for status tracking
const updateQuery = `
    UPDATE research_papers
    SET file_path = ?, pdf_url = ?, document_id = ?
    WHERE id = ?
`;

this.db.getDb().prepare(updateQuery).run(
    filePath, 
    pdfAttachment.data.url, 
    document.id,  // ← Link to document for embeddings
    paperId
);
```

**Now:**
- ✅ PDF downloaded from Zotero
- ✅ Imported via `documentService.importDocument()`
- ✅ Text extracted via pdf-parse
- ✅ Chunked into 1200-char segments with 150-char overlap
- ✅ Embeddings automatically generated via Ollama
- ✅ `document_id` stored in `research_papers` table
- ✅ Status badge shows in UI ("⏳ Checking..." → "✅ Ready")
- ✅ Papers searchable via RAG in Ask sidebar!

---

## Full Pipeline for Zotero Papers

```
1. User: Clicks "Sync Zotero Library"
   ↓
2. ZoteroSyncService.syncLibrary()
   - Fetches papers from Zotero API
   - Imports metadata to research_papers table
   ↓
3. ZoteroSyncService.syncAttachments()
   - Downloads PDF from Zotero
   - Saves to ~/Library/Application Support/rani/zotero/
   ↓
4. DocumentService.importDocument() [NEW!]
   - Extracts text via pdf-parse
   - Stores in documents table
   ↓
5. DocumentChunkService.rebuildDocumentChunks()
   - Splits into ~1200-char chunks
   - Stores in document_chunks table
   ↓
6. DocumentEmbeddingService.embedDocument()
   - Generates embeddings via Ollama (qwen3-embedding:8b)
   - Updates document_chunks.embedding column
   - Sets sync_state = 'embedded'
   ↓
7. research_papers.document_id updated [NEW!]
   - Links paper to document for quick status lookups
   ↓
8. UI: Status badge updates
   - "⏳ Checking..." → "✅ Ready"
   - Embed button hidden (already embedded)
   - Paper ready for RAG search!
```

---

## UI Changes

### My Library Tab - Paper Cards

#### Before:
```
┌──────────────────────────────────────┐
│ Paper Title                          │
│ Authors • 2024 • arXiv              │
│                                      │  ← No status badge!
│ [🗑️ Remove]                         │
└──────────────────────────────────────┘
```

#### After (Already Implemented):
```
┌──────────────────────────────────────┐
│ Paper Title                          │
│ Authors • 2024 • arXiv              │
│ ⏳ Checking...                      │  ← Status badge!
│ [🔄 Embed] [🗑️ Remove]              │
└──────────────────────────────────────┘

After embedding completes:
┌──────────────────────────────────────┐
│ Paper Title                          │
│ Authors • 2024 • arXiv              │
│ ✅ Ready                             │  ← Shows ready status
│ [🗑️ Remove]                         │  ← Embed button hidden
└──────────────────────────────────────┘
```

### Status Badge States

| Status | Badge | Meaning | Actions Available |
|--------|-------|---------|-------------------|
| `loading` | ⏳ Checking... | Status being fetched | None (loading) |
| `pending` | 🟡 Not Embedded | No embeddings yet | [🔄 Embed] button |
| `processing` | ⚙️ Generating... | Embeddings in progress | None (disabled) |
| `complete` | ✅ Ready | Fully embedded | None (ready for RAG) |
| `partial` | 🟠 Partial | Some chunks missing | [🔄 Embed] button |
| `failed` | ❌ Failed | Embedding error | [🔄 Embed] button |
| `no-document` | ⚠️ No PDF | No file to embed | None (can't embed) |
| `no-chunks` | ⚠️ No Text | PDF empty or text extraction failed | None |
| `error` | ⚠️ Error | Status check failed | [🔄 Embed] to retry |

---

## Code Changes Summary

### File: `src/features/research/zoteroSyncService.js`

**Method:** `syncAttachments(uid, paperId, zoteroKey, ...)`

**Changes:**
1. Added document import via `this.documentService.importDocument()`
2. Added `document_id` column update in `research_papers`
3. Added error handling with fallbacks
4. Added logging for debugging

**Key Addition:**
```javascript
// Import PDF as document and generate embeddings
document = await this.documentService.importDocument(filePath, uid, {
    isPaper: true,
    paperId: paperId,
    source: 'zotero',
    zoteroKey: zoteroKey
});

if (document && document.id) {
    console.log(`[ZoteroSyncService] PDF imported as document ${document.id}, embeddings generated`);
    
    // Link paper to document
    this.db.getDb().prepare(updateQuery).run(
        filePath, 
        pdfAttachment.data.url, 
        document.id,  // ← Critical link!
        paperId
    );
}
```

---

## Testing Checklist

### To Verify Fix Works:

1. **Connect Zotero:**
   - Settings → Zotero Integration
   - Add API key and User ID
   - Test connection

2. **Sync Library:**
   - Research → Zotero tab
   - Click "Sync Library"
   - Wait for sync to complete

3. **Check Status in My Library:**
   - Switch to "My Library" tab
   - Zotero papers should show:
     - ⏳ Checking... (initial)
     - ⚙️ Generating... (if embedding in progress)
     - ✅ Ready (when complete)

4. **Verify Embeddings Work:**
   - Enable "Research Library" toggle in Ask sidebar
   - Ask: "Summarize the key findings in my papers"
   - Should see "Sources" footnote with Zotero papers cited

5. **Check Database:**
   ```sql
   -- Verify document_id is set
   SELECT id, title, document_id, file_path 
   FROM research_papers 
   WHERE source = 'zotero';
   
   -- Verify embeddings exist
   SELECT 
       rp.title,
       COUNT(dc.id) as total_chunks,
       COUNT(CASE WHEN dc.sync_state = 'embedded' THEN 1 END) as embedded_chunks
   FROM research_papers rp
   LEFT JOIN documents d ON rp.document_id = d.id
   LEFT JOIN document_chunks dc ON d.id = dc.document_id
   WHERE rp.source = 'zotero'
   GROUP BY rp.id;
   ```

---

## Performance Considerations

### Sync Time Estimates:

| Papers | PDFs | Time to Download | Time to Embed | Total |
|--------|------|------------------|---------------|-------|
| 10 | 10 | 30-60s | 20-50s | **50s-110s** |
| 50 | 50 | 2-5 min | 2-4 min | **4-9 min** |
| 100 | 100 | 5-10 min | 4-8 min | **9-18 min** |

**Notes:**
- Download time depends on Zotero server and network speed
- Embedding time depends on Ollama GPU/CPU performance
- Embeddings run sequentially (16 chunks per batch)
- Large libraries should sync overnight or in background

---

## Error Handling

### Graceful Degradation:

1. **If PDF download fails:**
   - Paper still imported with metadata
   - Status shows "⚠️ No PDF"
   - User can manually upload PDF later

2. **If document import fails:**
   - Paper still has `file_path` saved
   - Status shows "🟡 Not Embedded"
   - User can click [🔄 Embed] to retry

3. **If embedding fails:**
   - Paper and chunks saved
   - Status shows "❌ Failed"
   - User can retry with [🔄 Embed] button

4. **If documentService unavailable:**
   - Fallback to old behavior (just save file path)
   - Logs warning
   - Status shows "🟡 Not Embedded"

---

## Future Enhancements

### Potential Improvements:

1. **Background Sync:**
   - Run embedding in separate worker thread
   - Don't block UI during long syncs
   - Show progress bar with chunk count

2. **Batch Optimization:**
   - Parallelize PDF downloads
   - Queue embeddings for batch processing
   - Resume interrupted syncs

3. **Selective Sync:**
   - Checkbox to skip embeddings during initial sync
   - "Sync metadata only" option
   - Batch embed later with one click

4. **Smart Re-sync:**
   - Only embed new/updated papers
   - Skip papers already embedded
   - Check `zotero_version` for changes

5. **Storage Management:**
   - Compress old embeddings
   - Archive rarely-used papers
   - Clear cache option

---

## Conclusion

✅ **Zotero papers now fully integrated with RAG system!**

**What Changed:**
- Zotero PDFs automatically imported and embedded
- Status badges show embedding progress in My Library
- Papers searchable via semantic search in Ask sidebar
- Proper error handling with fallback modes

**User Experience:**
1. Sync Zotero library (one click)
2. Wait for embeddings (automatic)
3. See status badges update (✅ Ready)
4. Ask questions about papers (RAG works!)

**No manual intervention needed** - it just works! 🎉
