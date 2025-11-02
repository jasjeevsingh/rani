# Quick Start: Adding Zotero Settings to UI

## Step 1: Import the Component

In your main settings file (e.g., `src/ui/settings/SettingsView.js`), import the Zotero settings component:

```javascript
import './ZoteroSettings.js';
```

## Step 2: Add to Settings UI

Add the Zotero settings section to your settings view:

```html
<!-- In your settings template -->
<section class="settings-section">
    <h2>Integrations</h2>
    <zotero-settings></zotero-settings>
</section>
```

## Step 3: Handle Sync Complete Event (Optional)

If you want to refresh the research library when sync completes:

```javascript
// Listen for sync-complete event
document.addEventListener('sync-complete', async (e) => {
    console.log('Zotero sync completed:', e.detail);
    
    // Refresh the research papers list
    await refreshResearchLibrary();
});
```

## Step 4: Test the Integration

1. Start RANI: `npm start`
2. Open Settings
3. Navigate to Zotero Integration section
4. Enter test credentials:
   - API Key: Get from https://www.zotero.org/settings/keys
   - User ID: Your Zotero user ID
5. Click "Test Connection"
6. Click "Connect Zotero"
7. Click "Sync Now"
8. Verify papers appear in Research Library

## Alternative: Standalone Integration

If you want to add Zotero settings to a different location:

```javascript
import { html } from 'lit';
import '../settings/ZoteroSettings.js';

render() {
    return html`
        <div class="integrations-panel">
            <zotero-settings></zotero-settings>
        </div>
    `;
}
```

## Database Migration

Before first use, ensure the database schema is updated. The schema changes are already in `src/features/common/config/schema.js`, but if you need to manually migrate:

```sql
-- Add Zotero columns to research_papers
ALTER TABLE research_papers ADD COLUMN zotero_key TEXT;
ALTER TABLE research_papers ADD COLUMN zotero_version INTEGER;

-- Add Zotero note tracking to annotations
ALTER TABLE annotations ADD COLUMN zotero_note_key TEXT;

-- Create Zotero credentials table
CREATE TABLE IF NOT EXISTS zotero_credentials (
    uid TEXT PRIMARY KEY,
    api_key TEXT NOT NULL,
    zotero_user_id TEXT NOT NULL,
    library_type TEXT DEFAULT 'user',
    last_sync_version INTEGER,
    last_sync_at INTEGER,
    updated_at INTEGER
);
```

## Example: Full Settings Integration

```javascript
// src/ui/settings/SettingsView.js

import { LitElement, html, css } from 'lit';
import './ZoteroSettings.js';

export class SettingsView extends LitElement {
    static styles = css`
        .settings-container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .section {
            margin-bottom: 40px;
        }
    `;

    render() {
        return html`
            <div class="settings-container">
                <h1>Settings</h1>
                
                <!-- API Keys Section -->
                <div class="section">
                    <h2>API Keys</h2>
                    <!-- Existing API settings -->
                </div>
                
                <!-- Integrations Section -->
                <div class="section">
                    <h2>Integrations</h2>
                    <zotero-settings @sync-complete=${this.handleSyncComplete}>
                    </zotero-settings>
                </div>
                
                <!-- Other Settings -->
            </div>
        `;
    }

    handleSyncComplete(e) {
        console.log('Sync complete:', e.detail);
        // Refresh research library or show notification
        this.dispatchEvent(new CustomEvent('refresh-library', {
            bubbles: true,
            composed: true
        }));
    }
}

customElements.define('settings-view', SettingsView);
```

## Troubleshooting

### Component Not Found

If you get "Failed to execute 'define' on 'CustomElementRegistry'":
- Ensure `ZoteroSettings.js` is imported before use
- Check that `customElements.define('zotero-settings', ZoteroSettings)` is called

### API Calls Failing

If Zotero API calls fail:
- Check that services are initialized in `researchFeature.js`
- Verify IPC handlers are registered
- Check preload.js has Zotero API exposure
- Look for errors in main process console

### Styles Not Applying

If component looks unstyled:
- Lit elements use Shadow DOM with encapsulated styles
- Component styles are defined in `ZoteroSettings.static.styles`
- Use CSS custom properties for theming

## Testing Checklist

- [ ] Component renders in Settings UI
- [ ] API key input works
- [ ] Test connection button functional
- [ ] Connect button saves credentials
- [ ] Sync button triggers library import
- [ ] Status messages display correctly
- [ ] Sync progress shows
- [ ] Papers appear in research library
- [ ] Disconnect button works
- [ ] Re-connecting works after disconnect

## Need Help?

- Check `ZOTERO_INTEGRATION.md` for full documentation
- See `ZOTERO_IMPLEMENTATION_SUMMARY.md` for architecture details
- Review code comments in `zoteroService.js` and `zoteroSyncService.js`
- Open an issue on GitHub if you encounter problems

---

**Ready to Go!** The Zotero integration is fully implemented and ready for use. Just add the component to your UI and start syncing! 🚀
