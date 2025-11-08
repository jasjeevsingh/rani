# Embedding Model Selector UI Implementation

## Overview
Added a UI component to the Settings modal that allows users to select between different embedding models (OpenAI and Ollama), matching the existing styling of LLM and STT model selectors.

## Changes Made

### 1. Backend Services (`src/features/common/services/modelStateService.js`)

#### `getAvailableModels(type)`
- **Modified**: Extended to support `'embedding'` type alongside `'llm'` and `'stt'`
- **Change**: Updated `modelListKey` ternary to triple ternary:
  ```javascript
  const modelListKey = type === 'llm' ? 'llmModels' : 
                      type === 'stt' ? 'sttModels' : 
                      'embeddingModels';
  ```
- **Result**: Returns available embedding models from all providers with API keys configured

#### `getSelectedModels()`
- **Modified**: Added `embedding` field to returned object
- **Change**: 
  ```javascript
  return {
      llm: active.llm?.selected_llm_model || null,
      stt: active.stt?.selected_stt_model || null,
      embedding: active.embedding?.selected_embedding_model || null,
  };
  ```
- **Result**: Returns currently selected embedding model

#### `setSelectedModel(type, modelId)`
- **Modified**: Added handling for `type === 'embedding'`
- **Change**: 
  ```javascript
  else if (type === 'embedding') {
      newSettings.selected_embedding_model = modelId;
      console.log(`[ModelStateService] Setting selected_embedding_model to: ${modelId}`);
  }
  ```
- **Result**: Persists selected embedding model to provider settings

#### `getProviderForModel(arg1, arg2)`
- **Modified**: Extended to recognize `'embedding'` type and check `embeddingModels` arrays
- **Changes**:
  1. Added `'embedding'` to type detection: `if (arg1 === 'llm' || arg1 === 'stt' || arg1 === 'embedding')`
  2. Updated models lookup to triple ternary:
     ```javascript
     const models = type === 'llm' ? PROVIDERS[providerId].llmModels : 
                   type === 'stt' ? PROVIDERS[providerId].sttModels : 
                   PROVIDERS[providerId].embeddingModels;
     ```
  3. Extended Ollama pattern detection: `if (type === 'llm' || type === 'embedding')`
- **Result**: Correctly identifies provider for embedding models (including Ollama embedding models)

---

### 2. UI Component (`src/ui/settings/SettingsView.js`)

#### Static Properties
- **Added**:
  ```javascript
  availableEmbeddingModels: { type: Array },
  selectedEmbedding: { type: String },
  isEmbeddingListVisible: { type: Boolean }
  ```
- **Purpose**: Reactive state for embedding model selection

#### Constructor Initialization
- **Added**:
  ```javascript
  this.availableEmbeddingModels = [];
  this.selectedEmbedding = null;
  this.isEmbeddingListVisible = false;
  ```
- **Purpose**: Initialize properties with safe default values

#### `refreshModelData()`
- **Modified**: Added embedding model fetching and state update
- **Changes**:
  1. Added `availableEmbedding` to parallel fetch:
     ```javascript
     const [availableLlm, availableStt, availableEmbedding, selected, storedKeys] = await Promise.all([
         window.api.settingsView.getAvailableModels({ type: 'llm' }),
         window.api.settingsView.getAvailableModels({ type: 'stt' }),
         window.api.settingsView.getAvailableModels({ type: 'embedding' }),
         // ...
     ]);
     ```
  2. Updated state properties:
     ```javascript
     this.availableEmbeddingModels = availableEmbedding;
     this.selectedEmbedding = selected.embedding;
     ```
- **Result**: Loads and displays available embedding models from backend

#### `toggleModelList(type)`
- **Modified**: Extended to support `'embedding'` type
- **Change**: Changed binary ternary to triple ternary:
  ```javascript
  const visibilityProp = type === 'llm' ? 'isLlmListVisible' : 
                        type === 'stt' ? 'isSttListVisible' : 
                        'isEmbeddingListVisible';
  ```
- **Result**: Properly toggles embedding model dropdown visibility

#### `selectModel(type, modelId)`
- **Modified**: Added embedding support for model selection and installation
- **Changes**:
  1. Extended Ollama model check:
     ```javascript
     const modelList = type === 'llm' ? this.availableLlmModels : this.availableEmbeddingModels;
     ```
  2. Added state update for embedding:
     ```javascript
     if (type === 'embedding') this.selectedEmbedding = modelId;
     ```
  3. Added visibility toggle:
     ```javascript
     this.isEmbeddingListVisible = false;
     ```
- **Result**: Handles embedding model selection and Ollama model installation

#### `getProviderForModel(type, modelId)`
- **Modified**: Extended to check `embeddingModels` arrays
- **Change**:
  ```javascript
  const models = type === 'llm' ? config.llmModels : 
                type === 'stt' ? config.sttModels : 
                config.embeddingModels;
  ```
- **Result**: Correctly identifies provider for embedding models in UI

#### Helper Function: `getModelName(type, id)`
- **Modified**: Extended to lookup embedding model names
- **Change**:
  ```javascript
  const models = type === 'llm' ? this.availableLlmModels : 
                type === 'stt' ? this.availableSttModels : 
                this.availableEmbeddingModels;
  ```
- **Result**: Displays human-readable names for embedding models

#### HTML Template
- **Added**: Complete embedding model selector component after STT selector
- **Structure**:
  ```html
  <div class="model-select-group">
      <label>Embedding Model: <strong>${getModelName('embedding', this.selectedEmbedding) || 'Not Set'}</strong></label>
      <button class="settings-button full-width" @click=${() => this.toggleModelList('embedding')} 
              ?disabled=${this.saving || this.availableEmbeddingModels.length === 0}>
          Change Embedding Model
      </button>
      ${this.isEmbeddingListVisible ? html`
          <div class="model-list">
              ${this.availableEmbeddingModels.map(model => {
                  const isOllama = this.getProviderForModel('embedding', model.id) === 'ollama';
                  const isInstalling = this.installingModels[model.id] !== undefined;
                  const installProgress = this.installingModels[model.id] || 0;
                  
                  return html`
                      <div class="model-item ${this.selectedEmbedding === model.id ? 'selected' : ''}" 
                           @click=${() => this.selectModel('embedding', model.id)}>
                          <span>${model.name}</span>
                          ${isOllama ? html`
                              ${isInstalling ? html`
                                  <div class="install-progress">
                                      <div class="install-progress-bar" style="width: ${installProgress}%"></div>
                                  </div>
                              ` : model.installed ? html`
                                  <span class="model-status installed">✓ Installed</span>
                              ` : html`
                                  <span class="model-status not-installed">Not Installed</span>
                              `}
                          ` : ''}
                      </div>
                  `;
              })}
          </div>
      ` : ''}
  </div>
  ```
- **Features**:
  - Displays current embedding model with human-readable name
  - Button to toggle model list dropdown
  - Disabled when no models available or saving
  - Shows all available embedding models from all providers
  - Ollama models show installation status and progress
  - Supports installing Ollama models directly from UI
  - Consistent styling with LLM and STT selectors

---

## Available Embedding Models

### OpenAI (Provider: `openai` and `openai-glass`)
- **text-embedding-3-small**: 1536 dimensions, fast, cost-effective ($0.0001/paper)
- **text-embedding-3-large**: 3072 dimensions, higher quality ($0.0007/paper)

### Ollama (Provider: `ollama`)
- **nomic-embed-text**: Local embedding model
- **qwen3-embedding:8b**: Slower but local alternative

---

## Integration with Document Embedding Service

The selected embedding model is already integrated with `documentEmbeddingService.js`:

1. **Auto-detection**: `getEmbeddingContext()` checks for OpenAI API key first, falls back to Ollama
2. **Model Selection**: Uses the model selected in settings (via `providerSettingsRepository`)
3. **Performance**: OpenAI models are 20-30x faster than Ollama CPU embeddings

The UI now provides an easy way to switch between embedding providers without editing code.

---

## Testing

### Manual Testing Steps
1. Open Settings modal
2. Verify "Embedding Model" section appears below "STT Model"
3. Click "Change Embedding Model" button
4. Verify dropdown shows available models:
   - OpenAI models if API key configured
   - Ollama models if Ollama running
5. Select a different model
6. Verify selection persists after closing and reopening settings
7. If selecting uninstalled Ollama model, verify installation flow works
8. Embed a document and verify selected model is used (check console logs)

### Expected Console Output
```
[SettingsView] Available LLM models: [...]
[ModelStateService] getAvailableModels type: embedding
[ModelStateService] setSelectedModel called - type: embedding, modelId: text-embedding-3-small
[ModelStateService] Found provider: openai for model: text-embedding-3-small
[ModelStateService] Setting selected_embedding_model to: text-embedding-3-small
[DocumentEmbeddingService] Using OpenAI embeddings with model: text-embedding-3-small
```

---

## Files Modified

1. **src/features/common/services/modelStateService.js**
   - `getAvailableModels()`: Added embedding type support
   - `getSelectedModels()`: Returns selected embedding model
   - `setSelectedModel()`: Saves selected embedding model
   - `getProviderForModel()`: Recognizes embedding models

2. **src/ui/settings/SettingsView.js**
   - Added reactive properties: `availableEmbeddingModels`, `selectedEmbedding`, `isEmbeddingListVisible`
   - Updated `refreshModelData()`: Fetches embedding models
   - Updated `toggleModelList()`: Supports embedding type
   - Updated `selectModel()`: Handles embedding selection
   - Updated `getProviderForModel()`: Checks embedding models
   - Updated `getModelName()`: Looks up embedding model names
   - Added HTML template for embedding model selector

---

## Design Consistency

The embedding model selector follows the exact same pattern as LLM and STT selectors:

- **Visual**: Same button styling, dropdown layout, and spacing
- **Behavior**: Toggle dropdown, select model, auto-install Ollama models
- **State**: Same saving/loading pattern using `window.api.settingsView` IPC
- **Installation**: Reuses existing `installOllamaModel()` flow with progress indicators

This ensures a consistent user experience across all model selection features.
