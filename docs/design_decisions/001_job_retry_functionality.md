# Design Decision: Job Retry Functionality

**Date**: 2025-12-26
**Status**: Implemented
**Author**: Claude

## Overview

Enable users to retry failed resume analysis jobs without re-uploading the file. This improves user experience by allowing recovery from temporary failures (API timeouts, service issues, etc.) without losing the original upload.

## Problem Statement

Currently, when an analysis job fails, users must:
1. Delete the failed job
2. Upload the resume again
3. Start a new analysis

This is inefficient and frustrating, especially for large files or when failures are due to temporary issues.

## Proposed Solution

Add a "Retry" button for failed jobs that:
1. Resets the job status to "queued"
2. Clears error messages and progress
3. Resubmits the job to the worker pool using the existing upload

## Data Schema Changes

### Database Tables Affected

**analysis_jobs table** - No schema changes needed. Uses existing columns:
- `status` - Reset from "failed" to "queued"
- `progress` - Reset to 0
- `current_step` - Reset to empty string
- `error_message` - Reset to NULL
- `completed_at` - Reset to NULL
- `updated_at` - Updated to current timestamp

**user_profile table** - Records deleted:
- Any partial profile data from failed attempt is deleted before retry

### New Repository Methods

```go
// ResetJobForRetry resets a failed job back to queued status
ResetJobForRetry(ctx context.Context, jobID string) error
```

## Business Logic

### Validation Rules

1. **Job must exist**: Return 404 if job_id not found
2. **Job must be failed**: Only jobs with status="failed" can be retried
3. **Upload must exist**: Original upload must still be in database
4. **No concurrent retries**: Prevent double-retry with optimistic locking via updated_at

### Retry Flow

```
User clicks Retry
    ↓
Frontend: Show confirmation modal
    ↓
User confirms
    ↓
Frontend: POST /api/analysis/retry-job?job_id=X
    ↓
Backend: Validate job status = "failed"
    ↓
Backend: Delete user_profile (if exists)
    ↓
Backend: UPDATE analysis_jobs SET status='queued', progress=0, ...
    ↓
Backend: Fetch upload data
    ↓
Backend: Call processJob(jobID, upload) in goroutine
    ↓
Backend: Return 202 Accepted
    ↓
Frontend: Update UI optimistically (show as queued)
    ↓
Auto-polling picks up the job and shows progress
```

### Error Handling

| Error Condition | HTTP Status | Response |
|----------------|-------------|----------|
| Job not found | 404 | `{"error": "Job not found"}` |
| Job not failed | 400 | `{"error": "Cannot retry job", "message": "only failed jobs can be retried, current status: X"}` |
| Upload not found | 500 | `{"error": "Failed to retry job"}` (upload deleted) |
| Database error | 500 | `{"error": "Failed to retry job"}` |

## API Endpoints

### New Endpoint

**POST** `/api/analysis/retry-job?job_id={job_id}`

**Request**:
```
Query params:
- job_id (required): The job ID to retry
```

**Success Response** (202 Accepted):
```json
{
  "success": true,
  "message": "Job retry started successfully",
  "job_id": "job_abc123",
  "status": "queued"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Cannot retry job",
  "message": "only failed jobs can be retried, current status: completed"
}
```

## Frontend Components

### UI Changes

**Profile Page** (`/profile`):
- Add "Retry" button (blue RefreshCw icon) for failed jobs
- Position: Between error message and delete button
- Shows spinner when retrying

**Retry Confirmation Modal**:
- Title: "Retry Analysis Job"
- Shows: Job ID, previous error message, created date
- Warning: "The job will be reset and reprocessed from the beginning. Previous analysis data will be cleared."
- Variant: "info" (blue theme)
- Buttons: "Retry Job" | "Cancel"

### State Management

New state variables:
```typescript
const [retryJobModalOpen, setRetryJobModalOpen] = useState(false)
const [jobToRetry, setJobToRetry] = useState<{job: AnalysisJob, uploadId: number} | null>(null)
const [retryingJobId, setRetryingJobId] = useState<string | null>(null)
```

Optimistic update:
```typescript
// Update job in state immediately
setJobsByUpload(prev => ({
  ...prev,
  [uploadId]: prev[uploadId].map(j =>
    j.job_id === job.job_id
      ? {...j, status: 'queued', progress: 0, current_step: '...', error_message: undefined}
      : j
  )
}))
```

## Data Points & Monitoring

### Metrics to Track

1. **Retry success rate**: `retries_succeeded / retries_attempted`
2. **Retry reasons**: Count by error_message patterns
3. **Time to retry**: Duration from failure to retry click
4. **Retry outcomes**: How many retried jobs succeed vs fail again

### Logs

```go
log.Printf("Retrying analysis job %s for upload %d", jobID, uploadID)
log.Printf("Job retry started successfully: %s", jobID)
```

### Traces (Future)

- Span: `retry_job`
  - Attributes: job_id, upload_id, previous_error
  - Events: job_reset, worker_started

## Testing Considerations

### Unit Tests Needed

1. Repository:
   - `ResetJobForRetry` successfully resets job
   - `ResetJobForRetry` deletes associated profile
   - `ResetJobForRetry` returns error if job not found

2. Worker:
   - `RetryJob` validates status = "failed"
   - `RetryJob` returns error for non-failed jobs
   - `RetryJob` successfully resubmits to worker pool

3. Handler:
   - Returns 404 for non-existent job
   - Returns 400 for non-failed job
   - Returns 202 for successful retry

### Integration Tests

1. Full retry flow from API call to job completion
2. Verify profile data is cleared
3. Verify job can be retried multiple times
4. Verify concurrent retry attempts are handled

### Edge Cases

1. **Upload deleted**: Job exists but upload was deleted → Should fail gracefully
2. **Multiple retries**: User clicks retry multiple times → Idempotent
3. **Job deleted during retry**: User deletes while processing → Worker handles missing job
4. **Worker pool full**: Retry waits for available slot

## Security Considerations

1. **Authorization**: User must own the job (check user_id in future)
2. **Rate limiting**: Prevent retry spam (future enhancement)
3. **Resource limits**: Retry uses same worker pool slots

## Performance Impact

- **Minimal**: Reuses existing processJob logic
- **Worker pool**: Retry jobs compete for same 5 concurrent slots
- **Database**: Single UPDATE + DELETE operation (~1-2ms)
- **No caching impact**: Jobs are not cached

## Rollback Plan

If issues arise:
1. Remove retry button from frontend
2. Disable endpoint via feature flag
3. Monitor for stuck jobs in "queued" status
4. Manual cleanup: `UPDATE analysis_jobs SET status='failed' WHERE status='queued' AND updated_at < NOW() - INTERVAL '1 hour'`

## Future Enhancements

1. **Auto-retry**: Automatically retry failed jobs with exponential backoff
2. **Retry limits**: Limit to 3 retries per job
3. **Retry history**: Track retry attempts in database
4. **Selective retry**: Allow retrying from specific step (e.g., skip extraction, retry only LLM)
5. **Batch retry**: Retry multiple failed jobs at once

## References

- Worker Pool Implementation: `/websocket-server/internal/analyzer/worker.go`
- Repository Interface: `/websocket-server/internal/repository/analysis_repository.go`
- Frontend Profile Page: `/chat-app/src/app/profile/page.tsx`
