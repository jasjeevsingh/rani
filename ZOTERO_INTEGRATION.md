# Zotero Integration for RANI

Complete integration with Zotero reference manager, enabling seamless synchronization of your research library, papers, notes, and PDFs between Zotero and RANI.

## 🎯 Overview

The Zotero integration allows you to:

- **Import Your Entire Library**: Sync all your papers from Zotero to RANI with one click
- **Keep PDFs in Sync**: Automatically download PDF attachments from Zotero
- **Preserve Annotations**: Import notes and annotations from Zotero items
- **Incremental Sync**: Only sync changes since last update for fast synchronization
- **Two-way Compatibility**: Work in both Zotero and RANI simultaneously

## 🚀 Quick Start

### 1. Get Your Zotero API Key

1. Visit [Zotero API Keys Settings](https://www.zotero.org/settings/keys)
2. Click **"Create new private key"**
3. Configure permissions:
   - ✅ **Allow library access**: Read Only
   - ✅ **Allow notes access**: Read Only
   - ✅ **Allow file access**: Read Only
4. Give your key a name (e.g., "RANI Integration")
5. Click **"Save Key"**
6. **Copy the generated API key** (you won't be able to see it again!)

### 2. Find Your User ID

Your Zotero User ID can be found in two places:

**Option A: From the API Keys page**
- It's displayed right after creating a new API key
- Look for "userID: 123456"

**Option B: From your profile**
- Visit your Zotero profile: https://www.zotero.org/[username]
- Your User ID is in the URL after `/users/`: https://www.zotero.org/users/123456

### 3. Connect in RANI

1. Open RANI Settings
2. Navigate to **Zotero Integration** section
3. Enter your **API Key**
4. Enter your **User ID**
5. Select **Library Type**:
   - **Personal Library**: Your own research collection
   - **Group Library**: A shared group collection (use Group ID instead of User ID)
6. Click **"Test Connection"** to verify
7. Click **"Connect Zotero"** to save

### 4. Sync Your Library

1. Click **"Sync Now"** to start importing
2. Wait for sync to complete (progress shown in status message)
3. View your imported papers in RANI's Research Library

## 📚 Features

### Full Library Sync

Import your entire Zotero library including:

- **Paper Metadata**: Title, authors, abstract, year, venue, DOI
- **PDF Attachments**: Automatically downloaded and stored locally
- **Notes**: Imported as RANI annotations
- **Tags & Collections**: Preserved in metadata
- **Citation Information**: Source tracking and references

### Incremental Sync

After initial sync, RANI only fetches items modified since last sync:

- ⚡ **Fast**: Only downloads new or changed items
- 🔄 **Automatic Version Tracking**: Uses Zotero's version system
- 📊 **Smart Updates**: Detects and updates modified papers

### File Management

- **Local Storage**: PDFs stored in `~/.rani/zotero/`
- **Automatic Downloads**: Fetches first PDF attachment for each paper
- **Organized**: Files named by Zotero's original filenames
- **Efficient**: Only downloads missing PDFs

### Metadata Preservation

All Zotero metadata is preserved in RANI:

```json
{
  "itemType": "journalArticle",
  "tags": ["machine learning", "neural networks"],
  "collections": ["PhD Research", "Deep Learning"],
  "dateAdded": "2024-01-15T10:30:00Z",
  "dateModified": "2024-01-20T14:45:00Z",
  "extra": "arXiv:2401.12345",
  "language": "en"
}
```

## 🔧 Advanced Usage

### Sync Options

When calling `syncLibrary()` programmatically:

```javascript
await window.api.zotero.syncLibrary({
  includeAttachments: true,  // Download PDFs
  includeNotes: true,         // Import notes as annotations
  forceFullSync: false        // false = incremental, true = full re-sync
});
```

### Group Libraries

To sync a Zotero group library:

1. Get the **Group ID** from the group's URL:
   - Visit your group: https://www.zotero.org/groups/123456/groupname
   - Group ID is `123456`
2. In RANI settings:
   - Select **"Group Library"**
   - Enter Group ID as User ID
   - Enter your API key (must have access to the group)

### Programmatic Access

Access Zotero API from renderer process:

```javascript
// Test connection
const result = await window.api.zotero.testConnection(apiKey, userId, 'user');

// Save credentials
await window.api.zotero.saveCredentials(apiKey, userId, 'user');

// Sync library
const syncResult = await window.api.zotero.syncLibrary({
  includeAttachments: true,
  includeNotes: true
});

// Get sync status
const status = await window.api.zotero.getSyncStatus();
console.log(`Last sync: ${new Date(status.lastSync)}`);
console.log(`Synced items: ${status.syncedItems}`);

// Disconnect
await window.api.zotero.deleteCredentials();
```

## 🗂️ Database Schema

### Zotero Credentials Table

```sql
CREATE TABLE zotero_credentials (
    uid TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    zotero_user_id TEXT NOT NULL,
    library_type TEXT DEFAULT 'user',
    last_sync_version INTEGER,
    last_sync_at INTEGER,
    updated_at INTEGER
);
```

### Research Papers Table (Extended)

```sql
-- Additional columns for Zotero integration
ALTER TABLE research_papers ADD COLUMN zotero_key TEXT;
ALTER TABLE research_papers ADD COLUMN zotero_version INTEGER;
```

### Annotations Table (Extended)

```sql
-- Track Zotero notes
ALTER TABLE annotations ADD COLUMN zotero_note_key TEXT;
```

## 🔍 Item Type Mapping

Zotero supports many item types. RANI imports these as research papers:

| Zotero Item Type | Imported to RANI |
|------------------|------------------|
| `journalArticle` | ✅ Yes |
| `conferencePaper` | ✅ Yes |
| `book` | ✅ Yes |
| `bookSection` | ✅ Yes |
| `thesis` | ✅ Yes |
| `manuscript` | ✅ Yes |
| `report` | ✅ Yes |
| `preprint` | ✅ Yes |
| `attachment` | ❌ Skipped (processed as child) |
| `note` | ❌ Skipped (processed as child) |

## 📝 Notes & Annotations

Zotero notes are imported as RANI annotations:

- **Standalone Notes**: Attached to parent paper item
- **Child Notes**: Linked to the paper they belong to
- **HTML Stripping**: HTML tags removed for clean text
- **Preservation**: Original Zotero note key stored for tracking

## 🔐 Security & Privacy

- **Local Storage**: API keys stored locally in SQLite database
- **No Cloud Sync**: Credentials never leave your machine
- **Read-Only Access**: API key only needs read permissions
- **Revocable**: Delete API key from Zotero settings anytime

## ⚠️ Limitations

1. **Read-Only Sync**: Changes in RANI don't sync back to Zotero
2. **No Real-time Sync**: Must manually trigger sync
3. **PDF Priority**: Only first PDF attachment per item is downloaded
4. **No Conflict Resolution**: Last sync wins on version conflicts
5. **No Bidirectional Tags**: Tags from Zotero preserved but not synced back

## 🐛 Troubleshooting

### Connection Failed

**Problem**: "Failed to connect to Zotero"

**Solutions**:
- Verify API key is correct (copy-paste carefully)
- Check User ID matches your Zotero account
- Ensure API key has library read permissions
- Test your API key at https://api.zotero.org/users/[USERID]/items?limit=1

### No Items Syncing

**Problem**: Sync completes but no papers appear

**Solutions**:
- Check if your Zotero library is empty
- Verify library type (user vs. group)
- Look for "skipped" count in sync results
- Check RANI console for errors

### PDFs Not Downloading

**Problem**: Papers imported but PDFs missing

**Solutions**:
- Ensure API key has "file access" permission
- Check if PDFs exist in Zotero (some items may not have attachments)
- Verify disk space available in `~/.rani/zotero/`
- Look for attachment download errors in sync results

### Sync Takes Too Long

**Problem**: Initial sync is very slow

**Solutions**:
- This is normal for large libraries (1000+ items)
- Zotero API rate limits to ~1 request/second
- Consider syncing in batches (not yet supported)
- Be patient - subsequent syncs are incremental and much faster

## 🎓 Use Cases

### Academic Researcher

> "I have 500 papers in Zotero organized by topic. I want to use RANI's AI to discuss them without losing my organization."

**Solution**: 
1. Connect Zotero to RANI
2. Full sync imports all 500 papers with metadata
3. Collections preserved in metadata for filtering
4. Use RANI's AI with full context of your library

### PhD Student

> "I'm reading papers daily and adding them to Zotero. I want them automatically available in RANI."

**Solution**:
1. Initial full sync imports existing library
2. Weekly "Sync Now" pulls new papers
3. Incremental sync is fast (~30 seconds)
4. Keep working in Zotero, sync when needed

### Research Team

> "Our lab uses a shared Zotero group library. Can we sync it to RANI?"

**Solution**:
1. Get Group ID from Zotero group URL
2. Use Group Library mode in RANI
3. Each team member syncs same papers
4. Collaborate in RANI with shared context

## 📊 Sync Statistics

After sync completes, you'll see:

- **Total Items**: Number of items fetched from Zotero
- **Imported**: New papers added to RANI
- **Updated**: Existing papers that were modified
- **Skipped**: Items not imported (attachments, notes, etc.)
- **Failed**: Items that encountered errors

Example:
```
Sync complete! 
Total: 250 items
Imported: 45 new papers
Updated: 12 modified papers
Skipped: 180 attachments/notes
Failed: 0 errors
```

## 🛣️ Roadmap

Future enhancements planned:

- [ ] **Bidirectional Sync**: Push changes from RANI back to Zotero
- [ ] **Real-time Sync**: Auto-sync on interval or Zotero changes
- [ ] **Collection Support**: Import and maintain Zotero collections in RANI
- [ ] **Tag Management**: Sync tags bidirectionally
- [ ] **Batch Sync**: Sync large libraries in manageable chunks
- [ ] **Conflict Resolution**: Smart merging of concurrent edits
- [ ] **Multiple Accounts**: Support multiple Zotero accounts
- [ ] **Export to Zotero**: Create Zotero items from RANI papers

## 🤝 API Reference

### ZoteroService

Main service for Zotero API communication.

#### Methods

**`testConnection(apiKey, userId, libraryType)`**
- Tests API credentials
- Returns: `{ success: boolean, message: string }`

**`fetchItems(apiKey, userId, libraryType, options)`**
- Fetches items from Zotero library
- Options: `{ limit, start, itemType, tag, q, since }`
- Returns: `Array<ZoteroItem>`

**`fetchCollections(apiKey, userId, libraryType)`**
- Fetches all collections
- Returns: `Array<ZoteroCollection>`

**`fetchItemAttachments(apiKey, userId, itemKey, libraryType)`**
- Fetches attachments for specific item
- Returns: `Array<ZoteroAttachment>`

**`downloadAttachment(apiKey, userId, itemKey, libraryType)`**
- Downloads PDF file
- Returns: `Buffer` (PDF data)

**`parseZoteroItem(zoteroItem)`**
- Converts Zotero item to RANI paper format
- Returns: `Object` (paper data)

### ZoteroSyncService

Service for synchronizing Zotero library with RANI.

#### Methods

**`syncLibrary(uid, options)`**
- Performs full sync
- Options: `{ includeAttachments, includeNotes, forceFullSync }`
- Returns: `{ success, totalItems, imported, updated, skipped, failed }`

**`getSyncStatus(uid)`**
- Gets current sync status
- Returns: `{ connected, lastSync, syncedItems, libraryType }`

**`deleteAllSyncedItems(uid)`**
- Removes all Zotero papers from RANI
- Returns: `number` (items deleted)

## 💡 Tips & Best Practices

1. **Initial Sync**: Do first sync when you have time (large libraries take a while)
2. **Regular Syncs**: Sync weekly or after major Zotero changes
3. **API Key Security**: Never share your API key publicly
4. **Backup**: RANI stores papers locally - backup your `~/.rani` directory
5. **Organization**: Use Zotero's collections - they're preserved in RANI metadata
6. **Tags**: Tag papers in Zotero for better organization in RANI

## 📞 Support

For issues or questions:

- **GitHub Issues**: [Report a bug](https://github.com/jasjeevsingh/rani/issues)
- **Discussions**: [Ask questions](https://github.com/jasjeevsingh/rani/discussions)
- **Zotero API Docs**: [Official documentation](https://www.zotero.org/support/dev/web_api/v3/start)

---

**Happy Researching! 🔬✨**

Zotero + RANI = The perfect research workflow
