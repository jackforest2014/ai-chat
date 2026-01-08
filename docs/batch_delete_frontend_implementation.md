# Batch Delete Frontend Implementation Guide

This document provides the exact code changes needed to add batch delete functionality to the profile page.

## 1. Add State Variables

Add these state variables after line 174 (after `const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null)`):

```typescript
// Batch delete state
const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false)
const [deletingBatch, setDeletingBatch] = useState(false)
```

## 2. Add Helper Functions

Add these helper functions after the `handleExport` function (around line 600):

```typescript
// Helper function to check if job is deletable (completed or failed)
const isDeletable = (status: string) => {
  return status === 'completed' || status === 'failed'
}

// Get all deletable jobs for an upload
const getDeletableJobsForUpload = (uploadId: number): AnalysisJob[] => {
  const jobs = jobsByUpload[uploadId] || []
  return jobs.filter(job => isDeletable(job.status))
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

// Handle select all for an upload
const handleSelectAllForUpload = (uploadId: number, checked: boolean) => {
  const deletableJobs = getDeletableJobsForUpload(uploadId)
  setSelectedJobs(prev => {
    const newSet = new Set(prev)
    if (checked) {
      deletableJobs.forEach(job => newSet.add(job.job_id))
    } else {
      deletableJobs.forEach(job => newSet.delete(job.job_id))
    }
    return newSet
  })
}

// Check if all deletable jobs for an upload are selected
const areAllDeletableSelected = (uploadId: number): boolean => {
  const deletableJobs = getDeletableJobsForUpload(uploadId)
  if (deletableJobs.length === 0) return false
  return deletableJobs.every(job => selectedJobs.has(job.job_id))
}

// Get count of selected jobs for an upload
const getSelectedCountForUpload = (uploadId: number): number => {
  const jobs = jobsByUpload[uploadId] || []
  return jobs.filter(job => selectedJobs.has(job.job_id)).length
}

// Handle batch delete button click
const handleBatchDeleteClick = () => {
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

    // Optimistic UI update: remove deleted jobs from all uploads
    setJobsByUpload(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(uploadIdStr => {
        const uploadId = parseInt(uploadIdStr)
        updated[uploadId] = updated[uploadId].filter(
          job => !selectedJobs.has(job.job_id)
        )
      })
      return updated
    })

    // Clear selection
    setSelectedJobs(new Set())

    // Show success message
    alert(`Successfully deleted ${result.deleted_count} job(s)`)
  } catch (error) {
    console.error('Batch delete error:', error)
    alert('Failed to delete jobs. Please try again.')

    // Refresh to show actual state
    const expandedArray = Array.from(expandedUploads)
    expandedArray.forEach(uploadId => {
      fetchJobsForUpload(uploadId)
    })
  } finally {
    setDeletingBatch(false)
  }
}
```

## 3. Add UI Elements - Select All and Delete Selected Button

Add this code **after line 959** (after the "No analysis jobs yet" message and before the job list):

```typescript
{/* Batch Actions Bar - Only show when upload is expanded and has jobs */}
{jobs.length > 0 && (
  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={areAllDeletableSelected(upload.id)}
        onChange={(e) => handleSelectAllForUpload(upload.id, e.target.checked)}
        disabled={getDeletableJobsForUpload(upload.id).length === 0}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        title="Select all deletable jobs"
      />
      <span className="text-sm text-gray-600">
        {getSelectedCountForUpload(upload.id) > 0
          ? `${getSelectedCountForUpload(upload.id)} selected`
          : 'Select all'}
      </span>
    </div>
    {getSelectedCountForUpload(upload.id) > 0 && (
      <button
        onClick={handleBatchDeleteClick}
        disabled={deletingBatch}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50"
      >
        {deletingBatch ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
        Delete Selected ({getSelectedCountForUpload(upload.id)})
      </button>
    )}
  </div>
)}
```

## 4. Add Checkbox to Each Job Row

Replace the job row div (line 967-974) with this:

```typescript
<div
  key={job.job_id}
  className={`pr-4 py-3 transition ${
    jobInProgress
      ? 'bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-pink-50/50'
      : selectedJobs.has(job.job_id)
      ? 'bg-indigo-50'
      : 'hover:bg-gray-50'
  }`}
>
  <div className="flex items-center gap-4">
    {/* Checkbox for batch selection */}
    <div className="flex-shrink-0 pl-4">
      <input
        type="checkbox"
        checked={selectedJobs.has(job.job_id)}
        onChange={(e) => handleJobSelection(job.job_id, e.target.checked)}
        disabled={!isDeletable(job.status)}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-30"
        onClick={(e) => e.stopPropagation()}
      />
    </div>

    {/* Status Icon - Animated for in-progress */}
    {jobInProgress ? (
      <PulsingStatusIndicator status={job.status} />
    ) : (
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusBadge.bg}`}>
        <StatusIcon className={`w-4 h-4 ${statusBadge.text}`} />
      </div>
    )}

    {/* Rest of the job info remains the same... */}
```

**Note**: The `pl-12` class should be removed from the original div and replaced with just `pr-4`, since we're adding the checkbox as a separate column with `pl-4`.

## 5. Add Batch Delete Confirmation Modal

Add this modal component after the existing `ConfirmModal` components (around line 1200+):

```typescript
{/* Batch Delete Confirmation Modal */}
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
      {Array.from(selectedJobs).slice(0, 10).map(jobId => {
        // Find the job to show details
        const job = Object.values(jobsByUpload)
          .flat()
          .find(j => j.job_id === jobId)

        return (
          <li key={jobId} className="text-sm text-gray-700">
            • Job {jobId.slice(0, 8)}... {job ? `(${job.status})` : ''}
          </li>
        )
      })}
      {selectedJobs.size > 10 && (
        <li className="text-sm text-gray-500 italic">
          ...and {selectedJobs.size - 10} more
        </li>
      )}
    </ul>
  </div>
</ConfirmModal>
```

## 6. Clear Selection When Upload is Collapsed

Add this effect after the other useEffect hooks:

```typescript
// Clear selection when uploads are collapsed
useEffect(() => {
  setSelectedJobs(prev => {
    const newSet = new Set(prev)
    // Remove jobs from collapsed uploads
    Array.from(newSet).forEach(jobId => {
      const job = Object.values(jobsByUpload)
        .flat()
        .find(j => j.job_id === jobId)
      if (job) {
        const uploadId = Object.keys(jobsByUpload).find(key =>
          jobsByUpload[parseInt(key)].some(j => j.job_id === jobId)
        )
        if (uploadId && !expandedUploads.has(parseInt(uploadId))) {
          newSet.delete(jobId)
        }
      }
    })
    return newSet
  })
}, [expandedUploads, jobsByUpload])
```

## Visual Summary

The final UI will look like:

```
┌─────────────────────────────────────────────┐
│ Upload: resume.pdf                          │
├─────────────────────────────────────────────┤
│ [✓] Select all    [Delete Selected (2)]     │ ← Batch actions bar
├─────────────────────────────────────────────┤
│ [✓] ● Completed | View | Export | Delete    │ ← Job 1 (selected)
│ [✓] ● Completed | View | Export | Delete    │ ← Job 2 (selected)
│ [ ] ● Analyzing | (grayed out checkbox)     │ ← Job 3 (not deletable)
│ [ ] ● Failed    | Retry | Delete            │ ← Job 4 (not selected)
└─────────────────────────────────────────────┘
```

## Testing Checklist

After implementation:
- [ ] Checkboxes appear for all jobs
- [ ] Non-deletable jobs (queued, processing) have disabled checkboxes
- [ ] Select All checkbox selects only deletable jobs
- [ ] Delete Selected button shows count
- [ ] Batch delete modal shows list of jobs
- [ ] Deletion removes jobs from UI
- [ ] Selection clears after successful deletion
- [ ] Error handling works correctly
- [ ] Selection persists during auto-polling
- [ ] Selection clears when upload is collapsed

## Integration Notes

1. The code assumes `backendUrl` is already defined (it is, based on existing code)
2. The code uses the existing `ConfirmModal` component
3. The code integrates with the existing `fetchJobsForUpload` function
4. The styling matches the existing design system

## Backend Endpoint

The implementation calls:
```
POST /api/analysis/batch-delete
Body: { "job_ids": ["id1", "id2", "id3"] }
```

This endpoint is already implemented in the backend.
