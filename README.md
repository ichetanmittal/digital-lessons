# Digital Lessons

AI-powered platform that generates interactive TypeScript/React lessons from simple text descriptions.

**Live Demo:** [https://digital-lessons.vercel.app/](https://digital-lessons.vercel.app/)

## Tech Stack

- **Next.js 15** - Full-stack React framework with App Router
- **TypeScript** - Type-safe development
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Claude 3.5 Sonnet** - AI lesson generation via Anthropic API
- **Inngest** - Background job orchestration for async lesson generation
- **Langfuse** - LLM observability and tracing
- **Sandpack** - Browser-based code execution and rendering
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Pre-built React components

## Project Structure

```
app/
├── api/
│   ├── inngest/route.ts          # Inngest webhook handler
│   └── lessons/
│       ├── route.ts               # GET/POST all lessons
│       └── [id]/route.ts          # GET/DELETE single lesson
├── lessons/[id]/page.tsx          # Lesson viewer page
├── page.tsx                       # Home page (form + table)
└── layout.tsx                     # Root layout with theme provider

components/
├── lesson-form.tsx                # Create lesson form
├── lesson-renderer.tsx            # Sandpack code executor
├── lessons-table.tsx              # Lessons list with real-time updates
└── ui/                            # shadcn/ui components

lib/
├── ai/
│   ├── claude.ts                  # Claude API integration + Langfuse tracing
│   ├── prompts.ts                 # AI prompt templates
│   └── validator.ts               # TypeScript compilation validation
├── supabase/
│   ├── client.ts                  # Browser Supabase client
│   ├── server.ts                  # Server Supabase client
│   └── queries.ts                 # Database query functions
└── tracing/langfuse.ts            # Langfuse initialization

inngest/
├── client.ts                      # Inngest client setup
└── functions.ts                   # Background job: lesson generation

migrations/
└── 001_create_lessons.sql         # Database schema
```

## Key Features

- **AI Generation** - Claude generates complete React components from text outlines
- **Type Safety** - Full TypeScript compilation validation before saving
- **Real-time Updates** - Supabase subscriptions update UI without refresh
- **Background Jobs** - Inngest handles long-running AI generation
- **Code Execution** - Sandpack renders interactive lessons in browser
- **Observability** - Langfuse traces every AI generation for debugging

## How It Works

1. User enters lesson outline (e.g., "10 question quiz on planets")
2. API creates database record with "generating" status
3. Inngest background job triggers:
   - Calls Claude API with structured prompt
   - Validates generated TypeScript code (compilation + security)
   - Saves to database with "generated" status
4. Real-time subscription updates UI automatically
5. User clicks to view lesson
6. Sandpack executes code and renders interactive component

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_HOST=
```

## Development

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)