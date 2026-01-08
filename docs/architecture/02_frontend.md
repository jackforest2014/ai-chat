# Frontend Architecture

**Module**: 02 - Frontend Architecture
**Last Updated**: 2025-12-26

[← Back to Architecture Index](README.md)

---

## Overview

The frontend is a Next.js 15 application using the App Router with React 19, TypeScript, and Tailwind CSS. It provides the user interface for resume upload, analysis viewing, job management, interview preparation, and real-time chat.

---

## Technology Stack

### Core Framework
- **Next.js**: 15.3.2 (App Router with React Server Components)
- **React**: 19.0.0
- **TypeScript**: 5.7.2

### Styling & UI
- **Tailwind CSS**: 4.1.13 (utility-first CSS framework)
- **Lucide React**: 0.468.0 (icon library)
- **Custom CSS**: Minimal, Tailwind-first approach

### Utilities
- **date-fns**: 4.1.0 (date formatting and manipulation)
- **pnpm**: 10.11.0 (package manager)

### Build Tools
- **Next.js compiler**: Built-in SWC compiler
- **TypeScript compiler**: 5.7.2
- **ESLint**: Next.js default config
- **PostCSS**: For Tailwind CSS processing

---

## Project Structure

```
chat-app/
├── src/
│   ├── app/                    # App Router pages
│   │   ├── layout.tsx         # Root layout (global providers)
│   │   ├── page.tsx           # Home/Login page
│   │   ├── chat/
│   │   │   └── page.tsx       # Chat interface
│   │   ├── interview/
│   │   │   └── page.tsx       # Interview preparation
│   │   ├── profile/
│   │   │   └── page.tsx       # User profile & job management
│   │   └── upload/
│   │       └── page.tsx       # Resume upload
│   ├── components/            # Reusable components
│   │   ├── ConfirmModal.tsx  # Reusable confirmation modal
│   │   └── (other components)
│   ├── hooks/                 # Custom React hooks
│   │   └── (custom hooks)
│   ├── lib/                   # Utility functions
│   │   └── utils.ts
│   └── types/                 # TypeScript type definitions
│       └── (type files)
├── public/                    # Static assets
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.ts        # Tailwind CSS config
├── next.config.js            # Next.js config
└── pnpm-lock.yaml           # Lock file
```

---

## Page Components

### 1. Home/Login Page (`app/page.tsx`)

**Purpose**: User authentication entry point

**Key Features**:
- Login form with email/password
- Session token storage in localStorage
- Redirect to upload page on success
- Error handling for failed authentication

**State Management**:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState('')
```

**API Integration**:
- POST `/api/auth/login` - User authentication
- Stores token in localStorage as `authToken`
- Redirects to `/upload` on success

### 2. Upload Page (`app/upload/page.tsx`)

**Purpose**: Resume upload interface

**Key Features**:
- File upload (PDF, DOC, DOCX, max 10MB)
- LinkedIn profile URL input (optional)
- File type validation
- Size validation
- Upload progress indication

**State Management**:
```typescript
const [file, setFile] = useState<File | null>(null)
const [linkedinUrl, setLinkedInUrl] = useState('')
const [uploading, setUploading] = useState(false)
```

**API Integration**:
- POST `/api/upload` - Multipart form data upload
- Redirects to `/profile` after successful upload

**Validation**:
- File types: `.pdf`, `.doc`, `.docx`
- Max file size: 10MB
- MIME type verification

### 3. Profile Page (`app/profile/page.tsx`)

**Purpose**: User profile, upload history, and job management

**Key Features**:
- List all user uploads
- View all analysis jobs per upload
- Auto-updating job status (polling every 2s)
- Retry failed jobs
- Delete completed/failed jobs
- Export completed analysis (JSON, CSV, PDF, DOCX)

**State Management**:
```typescript
const [uploads, setUploads] = useState<Upload[]>([])
const [jobsByUpload, setJobsByUpload] = useState<Record<number, AnalysisJob[]>>({})
const [expandedUpload, setExpandedUpload] = useState<number | null>(null)
const [deleteJobModalOpen, setDeleteJobModalOpen] = useState(false)
const [jobToDelete, setJobToDelete] = useState<string | null>(null)
const [retryJobModalOpen, setRetryJobModalOpen] = useState(false)
const [jobToRetry, setJobToRetry] = useState<{job: AnalysisJob, uploadId: number} | null>(null)
const [exportDropdownOpen, setExportDropdownOpen] = useState<string | null>(null)
```

**API Integration**:
- GET `/api/uploads` - Fetch all user uploads
- GET `/api/analysis/jobs?upload_id=X` - Fetch jobs for upload
- POST `/api/analysis/start` - Start new analysis job
- DELETE `/api/analysis/delete-job?job_id=X` - Delete job
- POST `/api/analysis/retry-job?job_id=X` - Retry failed job
- GET `/api/analysis/export?job_id=X&format=json|csv|pdf|docx` - Export results

**Auto-Polling Logic**:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // Fetch jobs for expanded upload
    if (expandedUpload !== null) {
      fetchJobsForUpload(expandedUpload)
    }
  }, 2000) // Poll every 2 seconds

  return () => clearInterval(interval)
}, [expandedUpload])
```

**Job Status Display**:
- `queued`: Blue badge "Queued"
- `extracting_text`: Blue badge "Extracting Text"
- `chunking`: Blue badge "Chunking"
- `generating_embeddings`: Blue badge "Generating Embeddings"
- `analyzing`: Blue badge "Analyzing"
- `completed`: Green badge "Completed"
- `failed`: Red badge "Failed"

**Action Buttons**:
- **Retry** (blue RefreshCw icon): Only for failed jobs
- **Export** (green Download icon): Only for completed jobs, dropdown with 4 formats
- **Delete** (red Trash2 icon): For completed or failed jobs

### 4. Chat Page (`app/chat/page.tsx`)

**Purpose**: Real-time chat interface with WebSocket

**Key Features**:
- WebSocket connection to backend
- Send/receive text messages
- Audio message support (future)
- Message history display
- Connection state indicator
- Auto-reconnection with exponential backoff

**State Management**:
```typescript
const [messages, setMessages] = useState<Message[]>([])
const [inputMessage, setInputMessage] = useState('')
const [ws, setWs] = useState<WebSocket | null>(null)
const [connected, setConnected] = useState(false)
```

**WebSocket Integration**:
```typescript
useEffect(() => {
  const websocket = new WebSocket('ws://localhost:8081/ws')

  websocket.onopen = () => {
    setConnected(true)
    // Send authentication token
    websocket.send(JSON.stringify({
      type: 'auth',
      token: localStorage.getItem('authToken')
    }))
  }

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    setMessages(prev => [...prev, message])
  }

  websocket.onclose = () => {
    setConnected(false)
    // Auto-reconnect with exponential backoff
    setTimeout(reconnect, reconnectDelay)
  }

  return () => websocket.close()
}, [])
```

**Message Types**:
- `user`: User-sent message
- `assistant`: AI-generated response
- `system`: System notifications

### 5. Interview Preparation Page (`app/interview/page.tsx`)

**Purpose**: AI-generated interview questions and practice

**Key Features**:
- Generate personalized interview questions
- View question categories (Technical, Behavioral, Situational, Problem-Solving)
- Difficulty levels (Easy, Medium, Hard)
- Regenerate answers
- Save to personal question library
- Tag-based filtering

**State Management**:
```typescript
const [questions, setQuestions] = useState<InterviewQuestion[]>([])
const [selectedCategory, setSelectedCategory] = useState<string>('all')
const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all')
const [generating, setGenerating] = useState(false)
```

**API Integration**:
- POST `/api/interview/generate` - Generate questions based on resume
- POST `/api/interview/regenerate-answer` - Get new answer for question
- POST `/api/interview/save-question` - Save to library
- GET `/api/interview/library` - Fetch saved questions

---

## Reusable Components

### ConfirmModal Component

**File**: `src/components/ConfirmModal.tsx`

**Purpose**: Reusable confirmation dialog for destructive actions

**Props**:
```typescript
interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}
```

**Usage Example**:
```tsx
<ConfirmModal
  isOpen={deleteJobModalOpen}
  onClose={() => setDeleteJobModalOpen(false)}
  onConfirm={handleDeleteJobConfirm}
  title="Delete Analysis Job"
  message="Are you sure you want to delete this job? This action cannot be undone."
  confirmText="Delete"
  variant="danger"
/>
```

**Features**:
- Backdrop click to close
- Escape key to cancel
- Color-coded variants (red for danger, yellow for warning, blue for info)
- Accessible with proper ARIA attributes

---

## State Management

### Current Approach: Component-Level State

The application currently uses React's built-in state management (`useState`, `useEffect`) without a global state management library.

**Pros**:
- Simple and straightforward
- No additional dependencies
- Easy to understand and debug

**Cons**:
- State duplication across components
- No centralized data fetching
- Prop drilling for shared state

**Future Consideration**: If the app grows significantly, consider:
- React Context API for global state (user session, theme)
- TanStack Query (React Query) for server state management
- Zustand for lightweight global state

---

## Data Fetching Patterns

### Pattern 1: Fetch on Mount

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch('/api/endpoint', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  fetchData()
}, [])
```

### Pattern 2: Auto-Polling for Real-Time Updates

```typescript
useEffect(() => {
  const interval = setInterval(fetchJobs, 2000)
  return () => clearInterval(interval)
}, [dependency])
```

### Pattern 3: Optimistic UI Updates

```typescript
const handleDelete = async (id: string) => {
  // Optimistically remove from UI
  setJobs(prev => prev.filter(job => job.id !== id))

  try {
    await fetch(`/api/delete?id=${id}`, { method: 'DELETE' })
  } catch (error) {
    // Rollback on error
    fetchJobs() // Re-fetch to restore state
  }
}
```

---

## Styling Approach

### Tailwind CSS Utility-First

**Example Button Styles**:
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>
```

**Common Patterns**:
- Responsive design: `sm:`, `md:`, `lg:` breakpoints
- Dark mode support: `dark:` prefix (not yet implemented)
- Custom animations: `transition-all duration-200`

**Tailwind Config** (`tailwind.config.ts`):
```typescript
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette
      },
    },
  },
  plugins: [],
}
```

---

## Routing & Navigation

### App Router Structure

Next.js 15 App Router provides file-system based routing:

```
app/
├── page.tsx           → /
├── chat/page.tsx      → /chat
├── interview/page.tsx → /interview
├── profile/page.tsx   → /profile
└── upload/page.tsx    → /upload
```

### Navigation Methods

**Client-Side Navigation**:
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/profile')
```

**Link Component**:
```tsx
import Link from 'next/link'

<Link href="/chat">Go to Chat</Link>
```

### Protected Routes

Currently implemented via client-side checks:

```typescript
useEffect(() => {
  const token = localStorage.getItem('authToken')
  if (!token) {
    router.push('/')
  }
}, [])
```

**Future Enhancement**: Middleware-based route protection

---

## Authentication Flow

### Login Flow

1. User enters email/password on home page
2. Frontend sends POST to `/api/auth/login`
3. Backend validates credentials
4. Backend returns session token
5. Frontend stores token in localStorage
6. Frontend redirects to `/upload`

### Session Management

**Storage**: `localStorage.authToken`

**Inclusion in Requests**:
```typescript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})
```

**Security Considerations**:
- ⚠️ localStorage is vulnerable to XSS attacks
- ⚠️ No token expiration currently implemented
- ⚠️ No refresh token mechanism

**Production Recommendations**:
- Use httpOnly cookies for token storage
- Implement token expiration and refresh
- Add CSRF protection

---

## File Upload Implementation

### Upload Component Logic

```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0]

  if (!selectedFile) return

  // Validate file type
  const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!validTypes.includes(selectedFile.type)) {
    alert('Invalid file type')
    return
  }

  // Validate file size (10MB)
  if (selectedFile.size > 10 * 1024 * 1024) {
    alert('File too large')
    return
  }

  setFile(selectedFile)
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  const formData = new FormData()
  formData.append('file', file)
  formData.append('linkedin_url', linkedinUrl)

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: formData
  })

  if (response.ok) {
    router.push('/profile')
  }
}
```

---

## Export Functionality

### Export Handler

```typescript
const handleExport = async (jobId: string, format: 'json' | 'csv' | 'pdf' | 'docx') => {
  try {
    const response = await fetch(
      `${backendUrl}/api/analysis/export?job_id=${jobId}&format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Export failed')
    }

    const blob = await response.blob()

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = `resume_analysis_${jobId}.${format}`

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Trigger browser download
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    setExportDropdownOpen(null)
  } catch (error) {
    console.error('Export error:', error)
    alert('Failed to export analysis')
  }
}
```

---

## WebSocket Integration

### Connection Management

```typescript
const [ws, setWs] = useState<WebSocket | null>(null)
const [reconnectDelay, setReconnectDelay] = useState(2000)

const connectWebSocket = () => {
  const websocket = new WebSocket('ws://localhost:8081/ws')

  websocket.onopen = () => {
    console.log('WebSocket connected')
    setConnected(true)
    setReconnectDelay(2000) // Reset delay on successful connection

    // Authenticate
    websocket.send(JSON.stringify({
      type: 'auth',
      token: localStorage.getItem('authToken')
    }))
  }

  websocket.onmessage = (event) => {
    const message = JSON.parse(event.data)
    handleMessage(message)
  }

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  websocket.onclose = () => {
    console.log('WebSocket disconnected')
    setConnected(false)

    // Exponential backoff reconnection
    setTimeout(() => {
      connectWebSocket()
      setReconnectDelay(prev => Math.min(prev * 2, 30000)) // Max 30s
    }, reconnectDelay)
  }

  setWs(websocket)
}

useEffect(() => {
  connectWebSocket()

  return () => {
    ws?.close()
  }
}, [])
```

---

## TypeScript Type Definitions

### Common Types

```typescript
interface Upload {
  id: number
  user_id: number
  filename: string
  linkedin_url?: string
  upload_date: string
  file_size: number
}

interface AnalysisJob {
  job_id: string
  upload_id: number
  status: 'queued' | 'extracting_text' | 'chunking' | 'generating_embeddings' | 'analyzing' | 'completed' | 'failed'
  progress: number
  current_step: string
  error_message?: string
  created_at: string
  completed_at?: string
}

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface InterviewQuestion {
  id: string
  question: string
  category: 'Technical' | 'Behavioral' | 'Situational' | 'Problem-Solving'
  difficulty: 'Easy' | 'Medium' | 'Hard'
  answer?: string
  saved: boolean
}
```

---

## Performance Optimizations

### Current Optimizations

1. **Auto-Polling Cleanup**: Clear intervals on unmount to prevent memory leaks
2. **Conditional Rendering**: Only render expanded sections
3. **Optimistic UI Updates**: Update UI before server confirmation

### Future Optimizations

1. **Code Splitting**: Use dynamic imports for heavy components
2. **Image Optimization**: Use Next.js Image component
3. **Memoization**: Use `useMemo` and `useCallback` for expensive operations
4. **Virtual Scrolling**: For long lists (job history, messages)
5. **Debouncing**: For search/filter inputs

---

## Error Handling

### Current Approach

```typescript
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    throw new Error('Request failed')
  }
  const data = await response.json()
  setData(data)
} catch (error) {
  console.error('Error:', error)
  alert('Something went wrong')
}
```

### Future Enhancements

- Global error boundary component
- Toast notifications for errors
- Retry mechanism for failed requests
- Detailed error messages from backend

---

## Accessibility

### Current Status

- ⚠️ Basic semantic HTML
- ⚠️ Keyboard navigation partially supported
- ⚠️ Screen reader support limited

### Future Improvements

- Add ARIA labels to all interactive elements
- Ensure proper focus management
- Add skip-to-content links
- Test with screen readers (NVDA, JAWS)
- Meet WCAG 2.1 AA standards

---

## Build & Deployment

### Development

```bash
cd chat-app
pnpm install
pnpm dev
```

Runs on `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

### Environment Variables

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

---

## Known Issues & Limitations

1. **No Global State Management**: State duplication across components
2. **localStorage Security**: Vulnerable to XSS attacks
3. **No Token Expiration**: Tokens never expire
4. **Client-Side Auth**: Route protection is client-side only
5. **No Error Boundaries**: Unhandled errors crash the app
6. **Limited Accessibility**: Not fully WCAG compliant
7. **No Offline Support**: Requires active internet connection
8. **Auto-Polling Performance**: Polling every 2s can be resource-intensive

---

## Future Enhancements

1. **Global State**: Implement Context API or Zustand
2. **Better Auth**: httpOnly cookies, token refresh, middleware protection
3. **Error Handling**: Global error boundary, toast notifications
4. **Accessibility**: Full WCAG 2.1 AA compliance
5. **Offline Mode**: Service worker for offline support
6. **PWA**: Convert to Progressive Web App
7. **Dark Mode**: Theme switching
8. **Internationalization**: Multi-language support

---

[Next: Backend Architecture →](03_backend.md)

[← Back to Architecture Index](README.md)
