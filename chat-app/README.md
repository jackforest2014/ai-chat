# AI Chat Assistant

A modern chat application built with Next.js 15, React 19, and TypeScript. Features AI-powered resume analysis, interview preparation, and real-time WebSocket communication.

![Next.js](https://img.shields.io/badge/Next.js-15.3.2-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178C6?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.13-38B2AC?style=for-the-badge&logo=tailwind-css)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Chat Interface](#chat-interface)
  - [Resume Upload & Analysis](#resume-upload--analysis)
  - [Interview Preparation](#interview-preparation)
  - [Q&A Chat Memory](#qa-chat-memory)
- [Configuration](#configuration)
- [Backend Integration](#backend-integration)
- [Troubleshooting](#troubleshooting)

## Features

- **User Authentication** - Signup, login, logout with profile management
- **Real-time Chat** - WebSocket-based instant messaging with audio support
- **Resume Upload** - PDF/Word upload with LinkedIn integration
- **AI Resume Analysis** - OpenAI-powered parsing with progress tracking
- **Interview Preparation** - AI-generated personalized questions with filtering
- **Q&A Chat Memory** - Semantic matching with saved answers (75% similarity threshold)
- **Audio Messages** - Voice recording with MediaRecorder API
- **Responsive Design** - Works on all devices
- **Auto-Reconnect** - Exponential backoff reconnection (2s → 30s max)

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 15.3.2 |
| UI Library | React | 19.0.0 |
| Language | TypeScript | 5.7.2 |
| Styling | Tailwind CSS | 4.1.13 |
| Icons | Lucide React | 0.468.0 |
| Date Utils | date-fns | 4.1.0 |
| Package Manager | pnpm | 10.11.0 |

## Project Structure

```
chat-app/
├── src/
│   ├── app/
│   │   ├── api/chat/              # Chat API route (HTTP fallback)
│   │   ├── analysis/[jobId]/      # Analysis result page
│   │   ├── interview/[jobId]/     # Interview prep page
│   │   ├── saved-questions/       # Saved Q&A library
│   │   ├── upload/                # Resume upload page
│   │   ├── profile/               # User profile page
│   │   ├── layout.tsx             # Root layout with AuthProvider
│   │   ├── page.tsx               # Home page (chat)
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── auth/                  # Authentication components
│   │   │   ├── AuthBar.tsx        # Top nav with user dropdown
│   │   │   ├── LoginModal.tsx     # Login popup
│   │   │   └── SignupModal.tsx    # Signup popup
│   │   ├── chat/                  # Chat components
│   │   │   ├── ChatContainer.tsx  # Main chat orchestrator
│   │   │   ├── ChatHeader.tsx     # Header with connection status
│   │   │   ├── ChatMessages.tsx   # Message list with Q&A badges
│   │   │   ├── ChatInput.tsx      # Text/audio input
│   │   │   ├── AudioMessage.tsx   # Audio playback component
│   │   │   ├── ConnectionStatus.tsx
│   │   │   └── ResumeSelectorPanel.tsx  # Draggable Q&A loader
│   │   ├── upload/                # Upload components
│   │   │   ├── UploadForm.tsx     # Drag-and-drop upload
│   │   │   ├── AnalysisProgress.tsx  # Job status polling
│   │   │   ├── AnalysisResult.tsx    # Profile display
│   │   │   └── InterviewPrepModal.tsx  # Job details form
│   │   └── ui/                    # Reusable UI components
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication state & methods
│   ├── hooks/
│   │   └── useWebSocket.ts        # WebSocket connection hook
│   ├── types/
│   │   ├── websocket.ts           # WebSocket types
│   │   └── chat.ts                # Chat/message types
│   └── config/
│       └── websocket.ts           # WebSocket configuration
├── .env.local                     # Environment variables
├── .env.example                   # Example environment file
├── package.json
├── tailwind.config.ts
├── postcss.config.mjs
└── README.md
```

## Getting Started

### Prerequisites

- **Node.js** v20+
- **pnpm** 10.11.0 (recommended)

### Installation

```bash
cd chat-app
corepack enable
pnpm install
```

### Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# WebSocket Server (Required)
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8081/ws

# Backend API (Required)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
```

### Development Server

```bash
pnpm dev
```

Open http://localhost:3000

### Production Build

```bash
pnpm build
pnpm start
```

## Usage

### Authentication

1. **Sign Up:**
   - Click "Sign Up" in the top navigation
   - Enter name, email, and password
   - Account is created and you're automatically logged in

2. **Log In:**
   - Click "Log In" in the top navigation
   - Enter email and password
   - Session persists in localStorage (`auth_token`, `auth_user`)

3. **User Menu:**
   - Hover over username to show dropdown menu
   - Access profile page or logout

4. **Profile Page:**
   - View account information and activity stats
   - Manage uploaded resumes and analysis jobs
   - Profile and Settings tabs

### Chat Interface

1. **Start Chat:**
   - Click "Start Chatting" on the landing page
   - WebSocket connection established automatically
   - Must be logged in to send messages

2. **Connection Status:**
   - Green dot = Connected
   - Yellow dot = Connecting/Reconnecting
   - Red dot = Disconnected

3. **Auto-Reconnect:**
   - Automatic reconnection with exponential backoff
   - 2s → 4s → 8s → 16s → 30s (max)
   - Maximum 3 reconnection attempts

4. **Audio Messages:**
   - Press and hold microphone button to record
   - Supports WebM, OGG, MP4, MPEG formats
   - Duration display during recording

### Resume Upload & Analysis

1. **Upload Resume:**
   - Navigate to `/upload`
   - Drag-and-drop or click to select file
   - Supported: PDF, DOC, DOCX (max 10MB)
   - Optional: Add LinkedIn URL
   - Uploads are associated with logged-in user

2. **Analyze:**
   - Click "Analyze Resume" after upload
   - Real-time progress tracking (0-100%)
   - Steps: Queued → Extracting Text → Chunking → Embeddings → AI Analysis → Completed
   - Results saved to `/analysis/[jobId]`

3. **View Results:**
   - Personal info (name, email, phone, location)
   - Skills (technical & soft)
   - Work experience with dates
   - Education history
   - AI-generated insights (strengths, weaknesses, recommendations)

### Interview Preparation

1. **Generate Questions:**
   - From analysis page, click "Prepare for Interview"
   - Fill in job details (title, level, company, requirements)
   - AI generates 10 personalized questions with answers

2. **Categories:**
   - Technical, Behavioral, Situational, Problem-Solving
   - Difficulty: Easy, Medium, Hard

3. **Features:**
   - Filter by category or difficulty tags
   - Sort questions
   - Regenerate individual answers
   - Save questions to profile

4. **Access Saved Questions:**
   - Navigate to `/saved-questions`
   - Questions associated with logged-in user

### Q&A Chat Memory

1. **Load Q&A:**
   - In chat, click "Load Q&A" button
   - Select a resume from the draggable panel
   - Q&A pairs loaded into WebSocket session memory

2. **Semantic Matching:**
   - Ask questions similar to saved ones
   - 75% similarity threshold for matches
   - Uses cosine similarity on embeddings

3. **Visual Indicators:**
   - "from Q&A" badge on matched answers
   - Similarity percentage display
   - Collapsible matched question viewer

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_WEBSOCKET_URL` | Yes | `ws://localhost:8081/ws` | WebSocket server URL |
| `NEXT_PUBLIC_BACKEND_URL` | Yes | `http://localhost:8081` | Backend API URL |
| `OPENAI_API_KEY` | No | - | For client-side AI features |
| `ANTHROPIC_API_KEY` | No | - | For Claude integration |

### Production Example (with ngrok)

```env
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-domain.ngrok-free.app/ws
NEXT_PUBLIC_BACKEND_URL=https://your-domain.ngrok-free.app
```

### WebSocket Configuration

Located in `src/config/websocket.ts`:

```typescript
{
  connectionTimeout: 5000,      // 5 second connection timeout
  reconnect: {
    enabled: true,
    maxAttempts: 3,
    delay: 2000,               // Initial delay (doubles each attempt)
    maxDelay: 30000            // Maximum 30 seconds
  }
}
```

## Backend Integration

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new user account |
| POST | `/api/auth/login` | Login and get session token |
| POST | `/api/auth/logout` | Logout and invalidate token |
| GET | `/api/auth/me` | Get current user info |

**Request/Response Examples:**

```typescript
// Signup
POST /api/auth/signup
{ "name": "John", "email": "john@example.com", "password": "secret" }

// Login Response
{
  "success": true,
  "user": { "id": 1, "name": "John", "email": "john@example.com" },
  "token": "session_token_here"
}
```

### Upload Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload resume (multipart/form-data) |
| GET | `/api/uploads` | List uploads (`user_id`, `limit` params) |
| GET | `/api/upload/get?id=X` | Get upload metadata |
| GET | `/api/upload/download?id=X` | Download file |
| DELETE | `/api/upload/delete?id=X` | Delete upload |

### Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze?id=X` | Start resume analysis |
| GET | `/api/analysis/status?job_id=X` | Get analysis progress |
| GET | `/api/analysis/result?job_id=X` | Get analysis result |
| GET | `/api/analysis/upload-jobs?upload_id=X` | Get jobs for upload |

### Interview Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/generate` | Generate interview questions |
| POST | `/api/interview/regenerate-answer` | Regenerate single answer |
| POST | `/api/interview/save-question` | Save Q&A pair |
| GET | `/api/interview/saved-questions` | Get saved questions |
| GET | `/api/interview/check-saved` | Check if question is saved |

### Chat Memory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/load-qa` | Load Q&A pairs into session |
| POST | `/api/chat/unload-qa` | Clear Q&A memory |
| POST | `/api/chat/message/text` | Save text message |
| POST | `/api/chat/message/audio` | Save audio message |
| GET | `/api/chat/messages` | Get conversation history |

## Troubleshooting

### Tailwind CSS PostCSS Plugin Error

```
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
```

**Fix:** Ensure `@tailwindcss/postcss` is installed and configured:

```bash
pnpm add -D @tailwindcss/postcss
```

`postcss.config.mjs`:
```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

### WebSocket Connection Failed

1. Check backend is running on correct port (default: 8081)
2. Verify `NEXT_PUBLIC_WEBSOCKET_URL` in `.env.local` includes `/ws` path
3. Check browser console for CORS or connection errors
4. For ngrok: ensure using `wss://` for secure connections

### Authentication Issues

1. Check localStorage for `auth_token` and `auth_user`
2. Verify backend `/api/auth/me` returns user data
3. Clear localStorage and re-login
4. Check network tab for 401 errors

### Build Errors

**useSearchParams without Suspense:**
```typescript
// Wrap component in Suspense
<Suspense fallback={<Loading />}>
  <ComponentUsingSearchParams />
</Suspense>
```

**useRef type error:**
```typescript
// Add initial value
const ref = useRef<NodeJS.Timeout | null>(null)
```

### Audio Recording Not Working

1. Check browser permissions for microphone access
2. Ensure HTTPS/localhost (required for MediaRecorder API)
3. Check supported MIME types in browser console

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

**Built with Next.js 15 and React 19**
