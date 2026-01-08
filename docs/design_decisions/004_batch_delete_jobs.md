# Design Document: Batch Delete for Analysis Jobs

**Feature**: Batch Delete for Multiple Jobs
**Date**: 2025-12-26
**Status**: Proposed
**Version**: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Motivation](#motivation)
3. [Requirements](#requirements)
4. [Design](#design)
5. [API Specification](#api-specification)
6. [Database Impact](#database-impact)
7. [Frontend Design](#frontend-design)
8. [Implementation Plan](#implementation-plan)
9. [Testing Strategy](#testing-strategy)
10. [Security Considerations](#security-considerations)
11. [Performance Considerations](#performance-considerations)
12. [Future Enhancements](#future-enhancements)

---

## Overview

This document outlines the design for implementing batch deletion of analysis jobs, allowing users to select and delete multiple completed or failed jobs simultaneously instead of deleting them one at a time.

---

## Motivation

### Current Limitations

Currently, users can only delete jobs one at a time using the single-job delete functionality:
- Click delete icon for each job
- Confirm each deletion individually
- Wait for each deletion to complete

### Problems with Current Approach

1. **Inefficient for Multiple Jobs**: Users with many completed/failed jobs must repeat the same action multiple times
2. **Time-Consuming**: Each deletion requires multiple clicks (delete button → confirm → wait)
3. **Poor UX**: No way to clean up large numbers of old jobs quickly
4. **Network Overhead**: Each deletion is a separate HTTP request

### User Scenarios

**Scenario 1: Clean Up Old Jobs**
- User has uploaded multiple versions of their resume
- Each upload has 3-5 completed analysis jobs
- User wants to delete all old jobs except the latest one
- Current process: 15+ individual deletions
- Desired: Select all old jobs and delete in one operation

**Scenario 2: Remove Failed Jobs**
- User has 10 failed jobs from earlier API errors
- User wants to clean them up after fixing the issue
- Current process: 10 individual deletions
- Desired: Select all failed jobs and delete at once

**Scenario 3: Bulk Cleanup**
- User wants to start fresh with a clean job history
- Has 50+ completed jobs across multiple uploads
- Current process: 50+ individual deletions (very tedious)
- Desired: "Select All" → Delete

---

## Requirements

### Functional Requirements

1. **Job Selection**:
   - User can select multiple jobs using checkboxes
   - "Select All" checkbox to select all deletable jobs for an upload
   - Visual indication of selected jobs
   - Selection count displayed

2. **Batch Deletion**:
   - "Delete Selected" button to delete all selected jobs
   - Button disabled when no jobs selected
   - Confirmation modal showing count and list of jobs to be deleted
   - Delete all selected jobs in a single operation

3. **Validation**:
   - Only allow deletion of completed or failed jobs
   - Jobs with status `queued`, `extracting_text`, `chunking`, `generating_embeddings`, or `analyzing` cannot be deleted
   - Gray out non-deletable jobs in selection UI

4. **Atomicity**:
   - Deletion should be atomic (all or nothing)
   - If any job fails to delete, rollback all deletions
   - OR: Best-effort deletion with partial success reporting

5. **Feedback**:
   - Show progress during deletion (if many jobs)
   - Success message with count of deleted jobs
   - Error message if deletion fails
   - Optimistic UI update (remove jobs immediately)

### Non-Functional Requirements

1. **Performance**: Delete 100 jobs in < 5 seconds
2. **Reliability**: Use database transactions for atomicity
3. **Usability**: Clear visual feedback for selection state
4. **Security**: Validate user ownership of jobs (when authorization is implemented)

---

## Design

### Architecture Approach

We'll implement batch delete using two approaches (to be decided):

**Option A: Single Endpoint, Array of IDs**
- Endpoint: `POST /api/analysis/batch-delete` (or `DELETE /api/analysis/jobs`)
- Request body: `{"job_ids": ["id1", "id2", "id3"]}`
- Backend processes all deletions in a transaction
- Returns success/failure for entire batch

**Option B: Single Endpoint, All-or-Nothing**
- Same as Option A but with strict atomicity
- Transaction rolls back if ANY deletion fails
- Simpler error handling but less flexible

**Option C: Multiple Parallel Requests**
- Frontend sends multiple DELETE requests concurrently
- No backend changes needed
- Less efficient but simpler implementation

**Recommended: Option A** (single endpoint with transaction)

### Why Option A?

1. **Efficient**: Single HTTP request, single transaction
2. **Atomic**: All deletions succeed or all fail (database transaction)
3. **Scalable**: Can handle 100+ jobs without overwhelming the server
4. **Better UX**: Single confirmation, single progress indicator
5. **RESTful**: Follows REST principles for batch operations

---

## API Specification

### New Endpoint: POST /api/analysis/batch-delete

**Description**: Delete multiple analysis jobs in a single operation

**Authentication**: Required (Bearer token)

**Request**:
```http
POST /api/analysis/batch-delete HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_ids": [
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"
  ]
}
```

**Request Body**:
```typescript
{
  job_ids: string[]  // Array of job UUIDs (min: 1, max: 100)
}
```

**Response 200 (All Successful)**:
```json
{
  "success": true,
  "deleted_count": 3,
  "deleted_jobs": [
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
    "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f"
  ],
  "message": "Successfully deleted 3 jobs"
}
```

**Response 207 (Partial Success - Optional)**:
```json
{
  "success": false,
  "deleted_count": 2,
  "failed_count": 1,
  "deleted_jobs": [
    "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e"
  ],
  "failed_jobs": [
    {
      "job_id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
      "error": "Cannot delete job with status 'analyzing'"
    }
  ],
  "message": "Deleted 2 of 3 jobs"
}
```

**Response 400 (Validation Error)**:
```json
{
  "error": "Invalid request",
  "message": "job_ids array cannot be empty"
}
```

```json
{
  "error": "Invalid request",
  "message": "Maximum 100 jobs can be deleted at once"
}
```

**Response 400 (All Jobs Non-Deletable)**:
```json
{
  "error": "Cannot delete jobs",
  "message": "All selected jobs are currently processing and cannot be deleted",
  "non_deletable_jobs": [
    {
      "job_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "status": "analyzing"
    }
  ]
}
```

**Response 500 (Database Error)**:
```json
{
  "error": "Deletion failed",
  "message": "Database transaction failed, no jobs were deleted"
}
```

### Request Validation

1. **job_ids array**:
   - Must be present
   - Must contain at least 1 job ID
   - Maximum 100 job IDs (to prevent abuse)
   - All IDs must be valid UUIDs

2. **Job Status**:
   - Only `completed` and `failed` jobs can be deleted
   - Jobs with other statuses will be rejected

3. **Authorization** (future):
   - User must own all selected jobs

---

## Database Impact

### Tables Affected

1. **analysis_jobs**:
   - DELETE rows matching job_ids
   - Only if status IN ('completed', 'failed')

2. **user_profile**:
   - CASCADE delete associated profiles
   - Each job may have 0 or 1 profile

### Transaction Flow

```sql
BEGIN TRANSACTION;

-- Step 1: Validate all jobs are deletable
SELECT job_id, status
FROM analysis_jobs
WHERE job_id IN ($1, $2, $3, ...);

-- Step 2: Check all statuses are 'completed' or 'failed'
-- If any job is not deletable, ROLLBACK

-- Step 3: Delete associated profiles
DELETE FROM user_profile
WHERE job_id IN ($1, $2, $3, ...);

-- Step 4: Delete jobs
DELETE FROM analysis_jobs
WHERE job_id IN ($1, $2, $3, ...)
  AND status IN ('completed', 'failed');

-- Step 5: Verify row count matches expected
-- If mismatch, ROLLBACK

COMMIT;
```

### Performance Considerations

**Query Optimization**:
- Use `WHERE job_id IN (...)` with parameterized query
- Index on `job_id` already exists (UNIQUE constraint)
- Deletion of 100 jobs should take < 100ms

**Locking**:
- Row-level locks on selected jobs
- Brief lock duration (transaction completes quickly)
- No deadlock risk (single table deletion)

---

## Frontend Design

### UI Components

#### 1. Job Selection Column

```tsx
// Add checkbox column to job table
<td className="w-10">
  <input
    type="checkbox"
    checked={selectedJobs.has(job.job_id)}
    onChange={(e) => handleJobSelection(job.job_id, e.target.checked)}
    disabled={!isDeletable(job.status)}
    className="w-4 h-4 rounded"
  />
</td>
```

#### 2. Select All Checkbox

```tsx
// Header checkbox to select all deletable jobs
<th className="w-10">
  <input
    type="checkbox"
    checked={allDeletableSelected}
    onChange={handleSelectAll}
    className="w-4 h-4 rounded"
  />
</th>
```

#### 3. Delete Selected Button

```tsx
<button
  onClick={handleBatchDelete}
  disabled={selectedJobs.size === 0 || deletingBatch}
  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
    selectedJobs.size === 0
      ? 'bg-gray-300 cursor-not-allowed'
      : 'bg-red-600 hover:bg-red-700 text-white'
  }`}
>
  <Trash2 className="w-4 h-4" />
  Delete Selected ({selectedJobs.size})
</button>
```

#### 4. Batch Delete Confirmation Modal

```tsx
<ConfirmModal
  isOpen={batchDeleteModalOpen}
  onClose={() => setBatchDeleteModalOpen(false)}
  onConfirm={handleBatchDeleteConfirm}
  title="Delete Multiple Jobs"
  message={`Are you sure you want to delete ${selectedJobs.size} job(s)? This action cannot be undone.`}
  confirmText="Delete All"
  variant="danger"
>
  <div className="mt-4 max-h-48 overflow-y-auto">
    <p className="text-sm text-gray-600 mb-2">Jobs to be deleted:</p>
    <ul className="space-y-1">
      {selectedJobsList.map(job => (
        <li key={job.job_id} className="text-sm">
          • Job {job.job_id.slice(0, 8)}... ({job.status})
        </li>
      ))}
    </ul>
  </div>
</ConfirmModal>
```

### State Management

```typescript
// Add to component state
const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false)
const [deletingBatch, setDeletingBatch] = useState(false)

// Helper function to check if job is deletable
const isDeletable = (status: string) => {
  return status === 'completed' || status === 'failed'
}

// Handle individual job selection
const handleJobSelection = (jobId: string, checked: boolean) => {
  setSelectedJobs(prev => {
    const newSet = new Set(prev)
    if (checked) {
      newSet.add(jobId)
    } else {
      newSet.delete(jobId)
    }
    return newSet
  })
}

// Handle select all
const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.checked) {
    const deletableJobIds = jobs
      .filter(job => isDeletable(job.status))
      .map(job => job.job_id)
    setSelectedJobs(new Set(deletableJobIds))
  } else {
    setSelectedJobs(new Set())
  }
}

// Handle batch delete
const handleBatchDelete = () => {
  if (selectedJobs.size === 0) return
  setBatchDeleteModalOpen(true)
}

// Handle batch delete confirmation
const handleBatchDeleteConfirm = async () => {
  setDeletingBatch(true)
  setBatchDeleteModalOpen(false)

  try {
    const response = await fetch(`${backendUrl}/api/analysis/batch-delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        job_ids: Array.from(selectedJobs)
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Batch deletion failed')
    }

    const result = await response.json()

    // Optimistic UI update: remove deleted jobs
    setJobsByUpload(prev => ({
      ...prev,
      [expandedUpload!]: prev[expandedUpload!].filter(
        job => !selectedJobs.has(job.job_id)
      )
    }))

    // Clear selection
    setSelectedJobs(new Set())

    // Show success message
    alert(`Successfully deleted ${result.deleted_count} job(s)`)
  } catch (error) {
    console.error('Batch delete error:', error)
    alert('Failed to delete jobs. Please try again.')

    // Refresh jobs to show actual state
    fetchJobsForUpload(expandedUpload!)
  } finally {
    setDeletingBatch(false)
  }
}
```

### Visual States

1. **No Selection**:
   - All checkboxes unchecked
   - "Delete Selected (0)" button disabled (gray)
   - Select All checkbox unchecked

2. **Partial Selection**:
   - Some checkboxes checked
   - "Delete Selected (N)" button enabled (red)
   - Select All checkbox shows indeterminate state

3. **All Deletable Selected**:
   - All deletable job checkboxes checked
   - "Delete Selected (N)" button enabled (red)
   - Select All checkbox checked

4. **Deleting**:
   - Loading spinner in button
   - Button disabled
   - Checkboxes disabled

---

## Implementation Plan

### Phase 1: Backend Implementation

**File**: `websocket-server/internal/handler/analysis.go`

1. Add `HandleBatchDeleteJobs` handler:
```go
func (h *AnalysisHandler) HandleBatchDeleteJobs(w http.ResponseWriter, r *http.Request) {
    // Parse request body
    var req struct {
        JobIDs []string `json:"job_ids"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    // Validate
    if len(req.JobIDs) == 0 {
        http.Error(w, "job_ids cannot be empty", http.StatusBadRequest)
        return
    }

    if len(req.JobIDs) > 100 {
        http.Error(w, "Maximum 100 jobs can be deleted at once", http.StatusBadRequest)
        return
    }

    // Call analyzer BatchDeleteJobs method
    result, err := h.analyzer.BatchDeleteJobs(r.Context(), req.JobIDs)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(result)
}
```

**File**: `websocket-server/internal/analyzer/analyzer.go`

2. Add method to interface:
```go
type ResumeAnalyzer interface {
    // ... existing methods ...
    BatchDeleteJobs(ctx context.Context, jobIDs []string) (*BatchDeleteResult, error)
}

type BatchDeleteResult struct {
    Success      bool     `json:"success"`
    DeletedCount int      `json:"deleted_count"`
    DeletedJobs  []string `json:"deleted_jobs"`
    Message      string   `json:"message"`
}
```

**File**: `websocket-server/internal/analyzer/worker.go`

3. Implement `BatchDeleteJobs`:
```go
func (a *DefaultResumeAnalyzer) BatchDeleteJobs(ctx context.Context, jobIDs []string) (*BatchDeleteResult, error) {
    // Call repository method
    deletedJobs, err := a.analysisRepo.BatchDeleteJobs(ctx, jobIDs)
    if err != nil {
        return nil, fmt.Errorf("batch deletion failed: %w", err)
    }

    return &BatchDeleteResult{
        Success:      true,
        DeletedCount: len(deletedJobs),
        DeletedJobs:  deletedJobs,
        Message:      fmt.Sprintf("Successfully deleted %d jobs", len(deletedJobs)),
    }, nil
}
```

**File**: `websocket-server/internal/repository/analysis_repository.go`

4. Add repository method:
```go
type AnalysisRepository interface {
    // ... existing methods ...
    BatchDeleteJobs(ctx context.Context, jobIDs []string) ([]string, error)
}
```

**File**: `websocket-server/internal/repository/postgres/analysis_postgres.go`

5. Implement repository method:
```go
func (r *AnalysisPostgresRepository) BatchDeleteJobs(ctx context.Context, jobIDs []string) ([]string, error) {
    // Start transaction
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    // Verify all jobs are deletable
    query := `
        SELECT job_id, status
        FROM analysis_jobs
        WHERE job_id = ANY($1)
    `

    rows, err := tx.QueryContext(ctx, query, pq.Array(jobIDs))
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var nonDeletable []string
    jobsFound := make(map[string]bool)

    for rows.Next() {
        var jobID, status string
        if err := rows.Scan(&jobID, &status); err != nil {
            return nil, err
        }

        jobsFound[jobID] = true

        if status != "completed" && status != "failed" {
            nonDeletable = append(nonDeletable, jobID)
        }
    }

    if len(nonDeletable) > 0 {
        return nil, fmt.Errorf("cannot delete %d jobs that are still processing", len(nonDeletable))
    }

    // Delete profiles
    _, err = tx.ExecContext(ctx, `
        DELETE FROM user_profile
        WHERE job_id = ANY($1)
    `, pq.Array(jobIDs))
    if err != nil {
        return nil, err
    }

    // Delete jobs
    result, err := tx.ExecContext(ctx, `
        DELETE FROM analysis_jobs
        WHERE job_id = ANY($1)
          AND status IN ('completed', 'failed')
    `, pq.Array(jobIDs))
    if err != nil {
        return nil, err
    }

    rowsAffected, _ := result.RowsAffected()

    // Commit transaction
    if err := tx.Commit(); err != nil {
        return nil, err
    }

    // Return list of deleted job IDs (only ones that were actually deleted)
    var deletedJobs []string
    for jobID := range jobsFound {
        if _, exists := jobsFound[jobID]; exists {
            deletedJobs = append(deletedJobs, jobID)
        }
    }

    return deletedJobs, nil
}
```

**File**: `websocket-server/cmd/server/main.go`

6. Register route:
```go
mux.HandleFunc("/api/analysis/batch-delete", analysisHandler.HandleBatchDeleteJobs)
```

### Phase 2: Frontend Implementation

**File**: `chat-app/src/app/profile/page.tsx`

1. Add state for batch selection
2. Add checkbox column to job table
3. Add "Select All" checkbox
4. Add "Delete Selected" button
5. Add batch delete confirmation modal
6. Implement handlers

### Phase 3: Testing

1. Manual testing with various scenarios
2. Error handling verification
3. UI/UX validation

### Phase 4: Documentation

1. Update API documentation
2. Update change log
3. Update architecture docs

---

## Testing Strategy

### Unit Tests

1. **Backend - Repository Tests**:
   - Test batch deletion with all valid jobs
   - Test with mix of deletable and non-deletable jobs
   - Test transaction rollback on error
   - Test with non-existent job IDs
   - Test with empty array
   - Test with > 100 jobs

2. **Backend - Handler Tests**:
   - Test request validation
   - Test successful batch deletion
   - Test authorization (when implemented)

### Integration Tests

1. **Full Flow Test**:
   - Create 10 jobs (5 completed, 3 failed, 2 analyzing)
   - Select all deletable jobs (8 total)
   - Execute batch delete
   - Verify 8 jobs deleted, 2 remain
   - Verify profiles deleted

2. **Error Scenarios**:
   - Attempt to delete processing jobs
   - Network error during deletion
   - Database error during transaction

### Manual Testing Checklist

- [ ] Select individual jobs and delete
- [ ] Select all jobs and delete
- [ ] Mix of completed and failed jobs
- [ ] Attempt to select non-deletable jobs (should be disabled)
- [ ] Cancel batch delete confirmation
- [ ] Delete 50+ jobs at once
- [ ] Check optimistic UI update
- [ ] Verify error messages for failures
- [ ] Check selection state persistence during polling

---

## Security Considerations

### Current Implementation

1. **No Authorization**: Any user can delete any jobs
2. **No Rate Limiting**: User can make unlimited batch delete requests

### Production Requirements

1. **User Ownership Validation**:
```go
// Verify all jobs belong to user
userID := getUserIDFromSession(r)
for _, jobID := range req.JobIDs {
    job, _ := h.analyzer.GetJobStatus(ctx, jobID)
    if job.UserID != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }
}
```

2. **Rate Limiting**:
   - Limit to 10 batch delete requests per minute
   - Limit to 100 jobs per request

3. **Audit Logging**:
   - Log all batch deletions with user ID, timestamp, job IDs

---

## Performance Considerations

### Metrics

| Operation | Expected Performance |
|-----------|---------------------|
| Delete 10 jobs | < 50ms |
| Delete 50 jobs | < 200ms |
| Delete 100 jobs | < 500ms |

### Optimization Strategies

1. **Database Indexing**: Already exists (UNIQUE index on job_id)
2. **Batch Size Limit**: Maximum 100 jobs per request
3. **Connection Pooling**: Use connection pool for concurrent requests
4. **Transaction Timeout**: 5-second timeout for batch deletion

### Bottlenecks

1. **Database Lock Duration**: Brief row-level locks during deletion
2. **Network Latency**: Array of job IDs in request body (minimal)
3. **Frontend Rendering**: Re-rendering job table after deletion (optimized with React keys)

---

## Future Enhancements

### Phase 2 Features

1. **Partial Success Handling**:
   - If some jobs fail to delete, show which ones succeeded
   - Option to retry failed deletions
   - Return 207 Multi-Status response

2. **Undo Functionality**:
   - Soft delete (mark as deleted, hide from UI)
   - "Undo" button for 30 seconds after deletion
   - Permanent deletion after timeout

3. **Filter + Delete**:
   - "Delete all failed jobs" button
   - "Delete all jobs older than X days"
   - "Delete all jobs for this upload"

4. **Keyboard Shortcuts**:
   - Ctrl+A to select all
   - Ctrl+Shift+D to delete selected
   - Esc to deselect all

5. **Bulk Actions Menu**:
   - Export selected jobs
   - Retry selected failed jobs
   - Archive selected jobs

### Accessibility Improvements

1. **ARIA Labels**: Add proper labels for checkboxes and buttons
2. **Keyboard Navigation**: Support Tab, Space, Enter for selection
3. **Screen Reader Announcements**: Announce selection count changes

---

## Conclusion

Batch delete is a valuable UX improvement that allows users to efficiently manage their job history. The implementation is straightforward and builds on existing single-job delete functionality.

**Estimated Implementation Time**: 1-2 days
- Backend: 4-6 hours
- Frontend: 4-6 hours
- Testing: 2-3 hours
- Documentation: 1-2 hours

**Risk**: Low (extends existing functionality, uses proven patterns)

**Value**: High (significant UX improvement, frequently requested feature)

---

**Document Version History**:
- v1.0 (2025-12-26): Initial design document
