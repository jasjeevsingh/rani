# Research Phase 5: Compact Mode & Quick Access Features

**Status**: MANDATORY - To be implemented after Phases 1-4
**Priority**: High
**Estimated Effort**: 2-3 weeks

---

## Overview

Phase 5 adds compact research features directly into the sidebar for quick access, while maintaining the full Research window for deep work. This provides the best of both worlds: quick paper lookups without leaving the sidebar, and full research capabilities when needed.

---

## Features to Implement

### 1. **Quick Search Bar in Sidebar** (Week 1)

#### Design
- Collapsible search widget below AskView
- Minimal UI: search input + quick results preview
- Opens full Research window on "View All Results"

#### Implementation
**Files to Create**:
- `src/ui/app/QuickResearchWidget.js` - LitElement component

**Integration**:
```javascript
// In MainHeader.js render():
<ask-view embedded></ask-view>
${this.sidebarOpen ? html`
  <quick-research-widget></quick-research-widget>
` : ''}
```

**UI Design**:
```
┌─────────────────────────┐
│ 🔍 Quick Paper Search   │ ← Collapsible header
├─────────────────────────┤
│ [Search papers...]      │ ← Input field
├─────────────────────────┤
│ Top 3 Results:          │
│ • Paper Title 1         │ ← Click to view details
│ • Paper Title 2         │
│ • Paper Title 3         │
│ [View All in Research →]│ ← Opens full window
└─────────────────────────┘
```

**API Endpoints**:
- Use existing `researchService.searchPapers(query, source, maxResults=3)`
- Cache results to avoid duplicate requests

**IPC Communication**:
```javascript
// preload.js
quickResearch: {
  searchPapers: (query, source) => ipcRenderer.invoke('research:quickSearch', query, source),
  openPaperInResearch: (paperId) => ipcRenderer.invoke('research:openPaper', paperId)
}
```

---

### 2. **Recent Papers Widget** (Week 1-2)

#### Design
- Shows 5 most recently viewed/imported papers
- Click to open in full Research window
- Displays: title, authors (truncated), date

#### Implementation
**Files to Modify**:
- `src/features/research/researchService.js` - Track recent papers
- `src/ui/app/MainHeader.js` - Add widget below QuickSearch

**UI Design**:
```
┌─────────────────────────┐
│ 📚 Recent Papers        │
├─────────────────────────┤
│ 🔖 Neural Networks...   │
│    Smith et al. 2024    │
├─────────────────────────┤
│ 🔖 Transformers Are...  │
│    Vaswani et al. 2023  │
├─────────────────────────┤
│ [View All →]            │
└─────────────────────────┘
```

**Data Storage**:
```javascript
// Store in localStorage or Firestore
{
  recentPapers: [
    {
      id: 'arxiv:2401.12345',
      title: 'Paper Title',
      authors: ['Author 1', 'Author 2'],
      viewedAt: timestamp,
      source: 'arxiv'
    }
  ]
}
```

---

### 3. **Floating Mini-Window for Quick Imports** (Week 2)

#### Design
- Small draggable window (300x200px)
- Drop PDFs to import
- Quick metadata form
- Auto-closes after import

#### Implementation
**Files to Create**:
- `src/window/quickImportWindow.js` - BrowserWindow config
- `src/ui/research/QuickImportView.js` - Import UI

**Activation**:
- Keyboard shortcut: `Cmd+Shift+I` (configurable)
- Drag & drop PDFs anywhere on screen
- Shows at cursor position

**UI Design**:
```
┌──────────────────────┐
│ Quick Paper Import   │
├──────────────────────┤
│ Drop PDF here        │
│ or                   │
│ [Browse Files...]    │
├──────────────────────┤
│ Title: [_________]   │
│ Authors: [________]  │
│ [Import] [Cancel]    │
└──────────────────────┘
```

**Features**:
- Auto-extract metadata from PDF
- Quick tags input
- One-click "Import & Close"
- History of last 10 imports

---

### 4. **Sidebar Research Stats** (Week 2-3)

#### Design
- Compact stats widget
- Shows: Total papers, papers read this week, annotations count
- Progress bar for reading goals

#### Implementation
**UI Design**:
```
┌─────────────────────────┐
│ 📊 Research Stats       │
├─────────────────────────┤
│ Library: 47 papers      │
│ This week: 5 read       │
│ Annotations: 23         │
│ ▓▓▓▓▓░░░░░ 50% goal     │
└─────────────────────────┘
```

**Data Source**:
- Aggregate from `documentsRepository`
- Update on paper view/import/annotation

---

### 5. **Quick Actions Menu** (Week 3)

#### Design
- Right-click context menu on Recent Papers
- Actions: Open, Share, Delete, Export citation

#### Implementation
**Actions**:
- **Open**: Opens paper in full Research window
- **Share**: Copy link or send to collaborators
- **Delete**: Remove from library (with confirmation)
- **Export**: Copy citation (APA/MLA/BibTeX)

**Context Menu**:
```javascript
// In QuickResearchWidget.js
_handleContextMenu(e, paper) {
  e.preventDefault();
  
  const menu = [
    { label: 'Open in Research', action: () => this._openPaper(paper) },
    { label: 'Copy Citation', action: () => this._copyCitation(paper) },
    { label: 'Remove from Library', action: () => this._deletePaper(paper) },
  ];
  
  // Show native context menu
  window.api.research.showContextMenu(menu);
}
```

---

## Technical Architecture

### Component Hierarchy
```
MainHeader (sidebar)
├── AskView (embedded chat)
├── QuickResearchWidget
│   ├── SearchBar
│   ├── QuickResults (top 3)
│   └── ViewAllButton
├── RecentPapersWidget
│   ├── PaperCard (x5)
│   └── ViewAllButton
└── ResearchStatsWidget
    ├── StatItem (x3)
    └── ProgressBar
```

### IPC Channels

**New Channels**:
```javascript
// research:quickSearch - Search with limited results
// research:openPaper - Open specific paper in full window
// research:getRecentPapers - Fetch recent papers list
// research:getStats - Get research statistics
// research:showContextMenu - Show native context menu
```

### State Management

**Shared State**:
- `recentPapers[]` - Synced between sidebar and full window
- `researchStats{}` - Updated on any research activity
- `quickSearchCache{}` - Cache last 10 searches

**Sync Strategy**:
```javascript
// Use EventEmitter to sync state
internalBridge.on('research:paperAdded', (paper) => {
  // Update recentPapers in sidebar
  // Update stats
  // Invalidate cache if needed
});
```

---

## UI/UX Considerations

### Collapsible Widgets
- All widgets are collapsible to save space
- Remember collapse state in localStorage
- Smooth animations (300ms)

### Scrolling
- Sidebar content scrollable independently
- Sticky header (RANI title bar)
- Smooth scroll to widget on focus

### Responsive Design
- Adapt to sidebar width (380px)
- Truncate long paper titles
- Show tooltips on hover

### Performance
- Lazy load widget content
- Cache recent papers (max 20)
- Debounce quick search (300ms)

---

## Implementation Phases

### **Week 1: Quick Search Bar**
- [ ] Create QuickResearchWidget component
- [ ] Implement search API integration
- [ ] Add "View All" button to open full Research
- [ ] Style and animations
- [ ] Test with arXiv and Semantic Scholar

### **Week 2: Recent Papers & Stats**
- [ ] Create RecentPapersWidget component
- [ ] Track paper views in researchService
- [ ] Implement ResearchStatsWidget
- [ ] Add localStorage for recent papers
- [ ] Test data persistence

### **Week 3: Quick Import & Polish**
- [ ] Create floating Quick Import window
- [ ] Implement drag & drop PDF import
- [ ] Add context menu for quick actions
- [ ] Performance optimizations
- [ ] End-to-end testing

---

## Testing Checklist

### Functional Tests
- [ ] Quick search returns relevant results
- [ ] Recent papers list updates on paper view
- [ ] Stats widget shows accurate counts
- [ ] Quick import saves papers correctly
- [ ] Context menu actions work
- [ ] "View All" opens full Research window

### Integration Tests
- [ ] Sidebar widgets sync with full Research window
- [ ] Multiple windows don't cause state conflicts
- [ ] IPC communication is reliable
- [ ] Performance with large libraries (1000+ papers)

### UI/UX Tests
- [ ] Widgets collapse/expand smoothly
- [ ] Scrolling works correctly
- [ ] Tooltips show properly
- [ ] Responsive to sidebar resize
- [ ] Keyboard navigation works

---

## Success Metrics

### User Engagement
- **Target**: 70% of users use Quick Search at least once per session
- **Target**: Average time to find paper reduced by 40%
- **Target**: 50% increase in papers imported via Quick Import

### Performance
- **Target**: Quick search response time < 500ms
- **Target**: Widget load time < 200ms
- **Target**: No UI lag with 1000+ papers in library

### User Satisfaction
- **Target**: 4.5+ stars on "Quick Access" feature feedback
- **Target**: 80% of users prefer sidebar search over full window for quick lookups

---

## Future Enhancements (Post-Phase 5)

1. **Smart Recommendations**: ML-based paper suggestions in sidebar
2. **Reading Progress Tracker**: Visual timeline of papers read
3. **Collaboration**: Share recent papers with team members
4. **Mobile Sync**: Access recent papers on mobile app
5. **Voice Search**: "Hey Rani, find papers about..."

---

## Dependencies

### Required APIs
- Research Service (existing)
- Documents Repository (existing)
- Firestore (for cloud sync)
- PDF.js (for metadata extraction)

### New Dependencies
- None (use existing stack)

---

## Notes & Considerations

### Design Philosophy
- **Lightweight**: Sidebar widgets are preview/quick-access only
- **Full Power in Window**: Complex tasks still use full Research window
- **Seamless Transition**: Easy to go from sidebar → full window

### Trade-offs
- **Pro**: Faster access to common research tasks
- **Pro**: Less context switching
- **Con**: Limited screen space in sidebar
- **Con**: Potential for cluttered UI if not designed carefully

### Accessibility
- All widgets keyboard navigable
- Screen reader friendly
- High contrast mode support
- Adjustable font sizes

---

## Sign-off

**Phase 5 Mandatory Requirements**:
- ✅ Quick Search Bar (must have)
- ✅ Recent Papers Widget (must have)
- ⚠️ Quick Import Window (nice to have)
- ⚠️ Research Stats (nice to have)
- ⚠️ Context Menu (nice to have)

**Minimum Viable Phase 5**: Quick Search + Recent Papers
**Full Phase 5**: All 5 features

---

**Document Version**: 1.0  
**Last Updated**: October 4, 2025  
**Owner**: Research Team  
**Status**: Ready for Implementation
