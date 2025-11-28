# Environment Variables Setup Guide

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual credentials:**
   ```bash
   nano .env
   # or
   vim .env
   ```

3. **Add your API keys:**
   ```bash
   # Replace the placeholder values with your actual keys
   LLM_API_KEY=sk-your-actual-key-here
   OPENAI_API_KEY=sk-your-openai-key-here
   ```

4. **Save and start the server:**
   ```bash
   ./bin/server
   ```

The server will automatically load the `.env` file on startup!

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_USER` | PostgreSQL username | `chatapp` |
| `DB_PASSWORD` | PostgreSQL password | `chatapp_password` |
| `DB_NAME` | Database name | `chatapp_db` |

### Optional (with defaults)

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `8080` | `8081` |
| `DB_HOST` | Database host | `localhost` | `localhost` |
| `DB_PORT` | Database port | `5432` | `5432` |
| `DB_SSLMODE` | SSL mode | `disable` | `require` |

### LLM Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `LLM_API_KEY` | Your LLM API key | `sk-...` |
| `LLM_API_URL` | LLM API endpoint | `https://api.openai.com/v1` |
| `LLM_MODEL` | Model to use | `gpt-4` or `gpt-3.5-turbo` |
| `OPENAI_API_KEY` | OpenAI key (for embeddings) | `sk-...` |

### ChromaDB Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CHROMA_HOST` | ChromaDB host | `localhost` |
| `CHROMA_PORT` | ChromaDB port | `8000` |

### Analyzer Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CHUNK_SIZE` | Text chunk size | `1000` |
| `CHUNK_OVERLAP` | Chunk overlap | `200` |
| `MAX_CONCURRENT_JOBS` | Max parallel jobs | `5` |

## Security Best Practices

### ✅ DO:
- Keep `.env` file in `.gitignore` (already done)
- Use different keys for development and production
- Rotate API keys regularly
- Use environment variables in production (not `.env` files)
- Set restrictive file permissions: `chmod 600 .env`

### ❌ DON'T:
- Commit `.env` file to git
- Share API keys in chat/email
- Use production keys in development
- Hard-code keys in source code

## Production Deployment

For production, **don't use a `.env` file**. Instead, set environment variables directly:

### Docker:
```bash
docker run -e LLM_API_KEY=your_key \
           -e OPENAI_API_KEY=your_key \
           -e DB_PASSWORD=your_password \
           your-image
```

### Kubernetes:
```yaml
env:
  - name: LLM_API_KEY
    valueFrom:
      secretKeyRef:
        name: app-secrets
        key: llm-api-key
```

### Systemd Service:
```ini
[Service]
Environment="LLM_API_KEY=your_key"
Environment="OPENAI_API_KEY=your_key"
ExecStart=/path/to/server
```

### Cloud Platforms:
- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Google Cloud**: Use Secret Manager
- **Azure**: Use Key Vault
- **Heroku/Railway**: Use their config vars/environment variables UI

## Verifying Configuration

Check if environment variables are loaded correctly:

```bash
# Start the server and check logs
./bin/server

# You should see:
# "Loaded configuration from .env file"
```

## Troubleshooting

### Problem: "No .env file found"
**Solution**: Create the `.env` file from `.env.example`:
```bash
cp .env.example .env
```

### Problem: Database connection failed
**Solution**: Check your database credentials in `.env`:
```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U chatapp -d chatapp_db -c "SELECT 1;"
```

### Problem: LLM API errors
**Solution**:
1. Verify your API key is valid
2. Check the API URL is correct
3. Ensure you have API credits/quota available
4. Check network connectivity

### Problem: File permissions error
**Solution**: Set proper permissions:
```bash
chmod 600 .env
```

## Example .env File

```bash
# Copy this to .env and replace with your actual values

# Server
PORT=8081

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=chatapp
DB_PASSWORD=your_secure_password_here
DB_NAME=chatapp_db
DB_SSLMODE=disable

# LLM API (example using OpenAI)
LLM_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx
LLM_API_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4

# Embeddings
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxx

# ChromaDB
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Analyzer
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CONCURRENT_JOBS=5
```

## Testing Your Configuration

1. **Create test `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Add minimal config:**
   ```bash
   DB_USER=chatapp
   DB_PASSWORD=chatapp_password
   DB_NAME=chatapp_db
   ```

3. **Start server:**
   ```bash
   ./bin/server
   ```

4. **Test database connection:**
   ```bash
   curl http://localhost:8081/health
   ```

5. **Add LLM keys when ready:**
   - Edit `.env`
   - Add `LLM_API_KEY` and other LLM-related variables
   - Restart server
   - Test analysis endpoint

## Getting API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy to `.env` as `OPENAI_API_KEY`

### Other LLM Providers
- **Anthropic Claude**: https://console.anthropic.com/
- **Cohere**: https://dashboard.cohere.com/
- **Hugging Face**: https://huggingface.co/settings/tokens
- **Custom API**: Contact your provider

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify all required variables are set
3. Test database connection separately
4. Validate API keys with the provider's test endpoint
