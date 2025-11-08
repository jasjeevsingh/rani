# OpenAI Embedding Support

## Overview

RANI now supports **OpenAI embeddings** as the primary embedding provider, with automatic fallback to local Ollama embeddings if no OpenAI API key is configured.

## Performance Comparison

| Provider | Model | Speed (52 chunks) | Speed (112 chunks) | Cost | Quality |
|----------|-------|-------------------|--------------------|----|---------|
| **OpenAI** | text-embedding-3-small | ~10-15s | ~20-30s | $0.0001/paper | Excellent |
| **OpenAI** | text-embedding-3-large | ~15-20s | ~25-35s | $0.0007/paper | Best |
| **Ollama** | nomic-embed-text | ~3-4 min | ~7-8 min | Free | Good |

## How It Works

The embedding system automatically:

1. **Checks for OpenAI API key** - If configured in Settings, uses OpenAI embeddings
2. **Falls back to Ollama** - If no OpenAI key, uses local `nomic-embed-text` model
3. **Handles errors gracefully** - Provides clear error messages if both fail

## Setup Instructions

### Option 1: Use OpenAI Embeddings (Recommended for Speed)

1. **Get an OpenAI API key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Add key to RANI**:
   - Open RANI Settings
   - Navigate to "AI Providers"
   - Find "OpenAI" section
   - Paste your API key
   - Click "Save"

3. **Embed papers**:
   - Go to Research view
   - Click "Embed" on any paper
   - Should see: `[DocumentEmbeddingService] OpenAI API key found, using OpenAI embeddings`
   - Expected time: **10-30 seconds** for most papers

### Option 2: Use Local Ollama Embeddings (Free but Slower)

1. **Install Ollama**:
   ```bash
   brew install ollama
   ```

2. **Pull the embedding model**:
   ```bash
   ollama pull nomic-embed-text
   ```

3. **Start Ollama**:
   ```bash
   ollama serve
   ```

4. **Embed papers**:
   - No API key needed
   - Click "Embed" on any paper
   - Expected time: **3-8 minutes** for most papers

## Model Selection

### OpenAI Models

- **text-embedding-3-small** (default)
  - Dimensions: 1536
  - Cost: $0.00002 per 1K tokens
  - Speed: Fast
  - Use for: General papers, cost-sensitive applications

- **text-embedding-3-large**
  - Dimensions: 3072
  - Cost: $0.00013 per 1K tokens
  - Speed: Fast
  - Use for: Scientific papers, maximum accuracy

### Ollama Models

- **nomic-embed-text** (default)
  - Dimensions: 768
  - Cost: Free
  - Speed: Slow on CPU (~50s per chunk)
  - Use for: Privacy-sensitive work, no internet access

## Cost Estimation

For a typical 10-page astrophysics paper (~50 chunks, ~20K tokens):

- **text-embedding-3-small**: $0.0004 (~0.04¢)
- **text-embedding-3-large**: $0.0026 (~0.26¢)
- **Ollama**: Free

**Annual cost** for embedding 1000 papers:
- **text-embedding-3-small**: ~$0.40
- **text-embedding-3-large**: ~$2.60
- **Ollama**: Free

## Troubleshooting

### "No OpenAI API key configured, falling back to Ollama"

This is normal if you haven't set up an OpenAI API key. The system will use Ollama instead.

**To fix**: Add an OpenAI API key in Settings → AI Providers → OpenAI

### "Failed to reach Ollama at http://localhost:11434"

Ollama is not running or not installed.

**To fix**:
```bash
# Install if needed
brew install ollama

# Start Ollama
ollama serve

# Pull embedding model
ollama pull nomic-embed-text
```

### "Embedding generation failed"

Check the console logs for specific error messages:

- **401 Unauthorized**: Invalid OpenAI API key
- **429 Too Many Requests**: Rate limit exceeded (wait a minute)
- **Connection timeout**: Network issue or Ollama not running

## Advanced Configuration

### Change OpenAI Model

Edit `src/features/documents/documentEmbeddingService.js`:

```javascript
const DEFAULT_OPENAI_MODEL = 'text-embedding-3-large';  // Change here
```

### Force Ollama (Skip OpenAI)

Comment out the OpenAI check:

```javascript
async getEmbeddingContext() {
    // Try OpenAI first (fastest and most reliable)
    // try {
    //     const openaiSettings = await providerSettingsRepository.getByProvider('openai');
    //     ...
    // }
    
    // Fall back to Ollama (local)
    try {
        const baseUrl = DEFAULT_OLLAMA_BASE_URL;
        ...
    }
}
```

### Increase Batch Size

For OpenAI, you can increase batch size for better performance:

Edit `src/features/documents/documentEmbeddingService.js`:

```javascript
await this.embedChunks({
    documentId: document.id,
    limit: allChunks.length,
    batchSize: 100  // Increase from 16 to 100
});
```

## Technical Details

### Embedding Pipeline

1. **Text Extraction**: PDF → pdf-parse → plain text
2. **Chunking**: 1200 chars per chunk, 150 char overlap
3. **Embedding**: Chunks → API/Ollama → vectors
4. **Storage**: Vectors → SQLite BLOB (Float32Array)
5. **Retrieval**: Question → embed → cosine similarity → top 5 chunks

### Vector Dimensions

- OpenAI small: 1536 dimensions
- OpenAI large: 3072 dimensions  
- Ollama nomic: 768 dimensions

All stored as `Float32Array` BLOBs in SQLite.

### Parallel Processing

- **OpenAI**: Batch API processes all texts in one request
- **Ollama**: 4 concurrent requests (configurable in `ollama.js`)

## Migration Guide

### Switching from Ollama to OpenAI

1. Add OpenAI API key in Settings
2. Delete existing embeddings (optional):
   ```sql
   UPDATE document_chunks SET embedding = NULL, sync_state = NULL;
   ```
3. Re-embed papers - will use OpenAI automatically

### Switching from OpenAI to Ollama

1. Remove OpenAI API key from Settings
2. Install and start Ollama
3. Re-embed papers - will use Ollama automatically

## Performance Optimization Tips

1. **Use OpenAI for speed** - 10-20x faster than Ollama on CPU
2. **Batch embed multiple papers** - More efficient API usage
3. **Keep embeddings in database** - Avoid re-embedding
4. **Use text-embedding-3-small** - Unless you need maximum accuracy

## Support

For issues or questions:
- Check logs: View → Toggle Developer Tools → Console
- Search for: `[DocumentEmbeddingService]` or `[OpenAI]`
- File an issue: https://github.com/jasjeevsingh/rani/issues
