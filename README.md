# Digital Lessons

AI-powered platform that generates interactive TypeScript/React lessons from simple text descriptions.

**Live Demo:** [https://digital-lessons.vercel.app/](https://digital-lessons.vercel.app/)

## Tech Stack

- **Next.js 15** - Full-stack React framework with App Router & Turbopack
- **React 19** - UI framework with performance optimizations (memo, useCallback, useMemo)
- **TypeScript** - Type-safe development
- **Supabase** - PostgreSQL database with real-time subscriptions & authentication
- **OpenAI GPT-5** - AI lesson code generation
- **Inngest** - Background job orchestration for async lesson generation
- **Langfuse** - LLM observability and tracing
- **Sandpack** - Browser-based code execution and rendering
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Pre-built React components

## Project Structure

```
app/
├── api/
│   ├── inngest/route.ts           # Inngest webhook handler
│   └── lessons/
│       ├── route.ts               # GET/POST all lessons
│       ├── [id]/route.ts          # GET/DELETE single lesson
│       └── [id]/stream/route.ts   # Server-Sent Events for code streaming
├── lessons/[id]/
│   ├── page.tsx                   # Lesson viewer (server component)
│   └── client-page.tsx            # Real-time streaming (client component)
├── page.tsx                       # Home page (form + lessons table)
├── sign-in/page.tsx               # Authentication: Sign in
├── sign-up/page.tsx               # Authentication: Sign up
└── layout.tsx                     # Root layout with theme & auth provider

components/
├── lesson-form.tsx                # Create lesson form with useCallback
├── lesson-renderer.tsx            # Sandpack code executor (memo)
├── lessons-table.tsx              # Lessons list with useMemo & useCallback
├── code-preview.tsx               # Real-time streaming code display (memo)
├── sign-in.tsx                    # Sign in form
├── sign-up.tsx                    # Sign up form
├── navbar.tsx                     # Navigation with auth controls
├── protected-route.tsx            # Auth guard wrapper
├── theme-switcher.tsx             # Dark/light mode toggle
└── ui/                            # shadcn/ui components

lib/
├── ai/
│   ├── openai.ts                  # OpenAI GPT-5 integration
│   ├── openai-streaming.ts        # Streaming code generation
│   ├── prompts.ts                 # AI prompt templates
│   ├── validator.ts               # TypeScript compilation validation
│   ├── judge.ts                   # Lesson quality evaluation
│   ├── images.ts                  # DALL-E 3 image generation
│   └── image-storage.ts           # Image persistence
├── supabase/
│   ├── client.ts                  # Browser Supabase client
│   ├── server.ts                  # Server Supabase client
│   ├── queries.ts                 # Database query functions
│   └── auth-queries.ts            # Auth-protected queries
├── auth-context.tsx               # React Context for auth state
├── auth-utils.ts                  # Authentication functions
├── hooks/
│   └── useCodeStream.ts           # Real-time code streaming hook
├── streaming/
│   └── event-store.ts             # Event bus for streaming
├── tracing/
│   └── langfuse.ts                # Langfuse initialization
└── types.ts                       # TypeScript interfaces

inngest/
├── client.ts                      # Inngest client setup
└── functions.ts                   # Background job: lesson generation workflow

migrations/
├── 001_create_lessons_safe.sql    # Lessons table schema
└── 002_add_user_authentication.sql # Auth schema

config/
├── next.config.ts                 # Next.js configuration with bundle analyzer
├── tailwind.config.ts             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## Key Features

- **AI Generation** - OpenAI GPT-5 generates complete React components from text outlines
- **Type Safety** - Full TypeScript compilation validation + security checks before saving
- **Real-time Updates** - Supabase subscriptions update UI without refresh + Server-Sent Events for code streaming
- **Background Jobs** - Inngest handles long-running AI generation with automatic retries
- **Code Execution** - Sandpack renders interactive lessons in browser with hot reload
- **Observability** - Langfuse traces every AI generation for debugging and performance monitoring
- **Authentication** - Supabase Auth with email/password, auto-login on signup
- **Performance Optimized** - React memo, useCallback, useMemo reduce unnecessary re-renders
- **AI Images** - Optional DALL-E 3 image generation for visual lessons
- **Quality Scoring** - AI-powered lesson evaluation and grading

## How It Works

### Authentication Flow
1. User signs up with email & password (auto-login enabled)
2. User is immediately redirected to home page (no separate login step)
3. Auth state persists via Supabase sessions

### Lesson Generation Flow
1. Authenticated user enters lesson outline (e.g., "10 question quiz on planets")
2. POST `/api/lessons` creates database record with "generating" status
3. Inngest background job triggers with multi-step workflow:
   - **Optional**: Generate AI images via DALL-E 3
   - **Stream**: Call OpenAI GPT-5 with structured prompt (code streams in real-time via SSE)
   - **Validate**: TypeScript compiler checks syntax + custom security rules
   - **Auto-fix**: If validation fails, attempt AI auto-correction
   - **Grade**: AI evaluates lesson quality and score
   - **Save**: Persist final code to database with "generated" status
4. Real-time Supabase subscriptions + SSE stream update UI automatically
5. User clicks lesson in table to view
6. Sandpack executes code in browser sandbox and renders interactive component
7. User can delete lesson (soft delete handled)

## Environment Variables

```env
# Supabase (Database & Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI (Lesson Generation)
OPENAI_API_KEY=sk-...

# Inngest (Background Jobs)
INNGEST_EVENT_KEY=your-event-key
INNGEST_SIGNING_KEY=your-signing-key

# Langfuse (LLM Observability)
LANGFUSE_SECRET_KEY=your-secret-key
LANGFUSE_PUBLIC_KEY=your-public-key
LANGFUSE_HOST=https://cloud.langfuse.com (optional)
```

## Development

### Prerequisites
- Node.js 18+ (Bun or npm)
- Supabase account with database
- OpenAI API key
- Inngest account (for background jobs)

### Setup

```bash
# Install dependencies
bun install

# Copy environment variables template
cp .env.example .env.local

# Fill in your environment variables in .env.local

# Start Inngest dev server (in separate terminal)
bunx inngest-cli@latest dev

# Start Next.js dev server (Turbopack enabled)
bun run dev

# (Optional) Build bundle analysis
bun run build:analyze
```

### Available Scripts

```bash
bun run dev              # Start dev server with Turbopack
bun run build            # Build for production
bun run build:analyze    # Build with bundle size analysis
bun run start            # Start production server
bun run lint             # Run ESLint
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

