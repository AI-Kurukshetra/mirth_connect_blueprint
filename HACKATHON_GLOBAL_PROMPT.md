# ðŸ† Bacancy Hackathon â€” Global Prompt File
> Stack: Next.js + Supabase + Vercel | Duration: 10 Hours | Format: Solo

---

## ðŸ§  HOW TO USE THIS FILE

Feed this file to Codex CLI at the start of your session:
```bash
codex --instructions HACKATHON_GLOBAL_PROMPT.md
```
Or reference it in every major prompt:
> "Following the rules in my global prompt, build [feature]..."

---

## ðŸŽ¯ MASTER SYSTEM PROMPT

You are an elite full-stack engineer and product designer helping me build and ship a production-quality SaaS application in **10 hours** during a solo hackathon.

### Core Constraints
- **Framework**: Next.js 16+ (App Router)
- **Database & Auth**: Supabase (Postgres + Row Level Security + Auth)
- **Deployment**: Vercel
- **AI Tooling**: Codex CLI (this session)
- **Time Budget**: 10 hours total â€” ruthlessly prioritize shipping

### Non-Negotiables
1. Every form/input must have **client-side AND server-side validation**
2. **Authentication** via Supabase Auth (email/password + optional OAuth)
3. **Row Level Security (RLS)** policies on all Supabase tables
4. **Responsive design** â€” mobile-first, looks great on all screen sizes
5. **Error boundaries** and user-friendly error messages everywhere
6. **Loading states** on all async operations
7. **TypeScript** throughout â€” no `any` types

### Code Quality Rules
- Use **Zod** for all schema validation (shared between client and server)
- Use **React Hook Form** for all forms
- Use **Server Actions** for mutations (not API routes unless necessary)
- All DB queries go through typed Supabase client helper functions
- No inline styles â€” use **Tailwind CSS** utility classes only
- Components live in `/components`, pages in `/app`, utils in `/lib`

---

## ðŸ“ PROJECT SCAFFOLD

### Immediate Setup Commands
```bash
# 1. Create Next.js app
npx create-next-app@latest flowboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd flowboard

# 2. Install core dependencies
npm install @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers
npm install lucide-react clsx tailwind-merge
npm install -D @types/node

# 3. Install UI (pick one)
npx shadcn@latest init   # Recommended for speed

# 4. Install testing
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# 5. Install additional utilities
npm install sonner date-fns zustand
```

### Create `.mcp.json` in project root (Next.js DevTools MCP)
**Always create this file immediately after scaffolding â€” required for Next.js MCP:**
```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```
> Requires Next.js 16+ (already satisfied by `create-next-app@latest`).
> Start `npm run dev` first, then run `codex` â€” Next.js MCP auto-connects.
> Gives Codex live access to runtime errors, logs, and routes.

### Folder Structure
```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â”œâ”€â”€ login/page.tsx
â”‚   â”‚   â”œâ”€â”€ signup/page.tsx
â”‚   â”‚   â””â”€â”€ layout.tsx
â”‚   â”œâ”€â”€ (dashboard)/
â”‚   â”‚   â”œâ”€â”€ dashboard/page.tsx               # projects list
â”‚   â”‚   â”œâ”€â”€ dashboard/new-project/page.tsx   # create project
â”‚   â”‚   â”œâ”€â”€ dashboard/[projectSlug]/
â”‚   â”‚   â”‚   â”œâ”€â”€ board/page.tsx               # Kanban board â­
â”‚   â”‚   â”‚   â”œâ”€â”€ issues/page.tsx              # issues list
â”‚   â”‚   â”‚   â”œâ”€â”€ members/page.tsx             # team members
â”‚   â”‚   â”‚   â””â”€â”€ settings/page.tsx            # project settings
â”‚   â”‚   â””â”€â”€ layout.tsx
â”‚   â”œâ”€â”€ globals.css
â”‚   â”œâ”€â”€ layout.tsx
â”‚   â””â”€â”€ page.tsx                             # landing page
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ ui/                   # shadcn components
â”‚   â”œâ”€â”€ forms/                # form components with validation
â”‚   â”œâ”€â”€ layout/               # header, sidebar, footer
â”‚   â”œâ”€â”€ board/                # KanbanBoard, IssueCard, IssueDetailDialog
â”‚   â”œâ”€â”€ issues/               # IssuesTable, IssueFilters
â”‚   â””â”€â”€ members/              # MembersList, InviteMemberForm
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ supabase/
â”‚   â”‚   â”œâ”€â”€ client.ts         # browser client
â”‚   â”‚   â”œâ”€â”€ server.ts         # server client
â”‚   â”‚   â””â”€â”€ middleware.ts
â”‚   â”œâ”€â”€ validations/
â”‚   â”‚   â”œâ”€â”€ issue.ts          # Zod schema for issues
â”‚   â”‚   â”œâ”€â”€ project.ts        # Zod schema for projects
â”‚   â”‚   â”œâ”€â”€ member.ts         # Zod schema for members
â”‚   â”‚   â””â”€â”€ auth.ts           # Zod schema for auth
â”‚   â”œâ”€â”€ actions/
â”‚   â”‚   â”œâ”€â”€ issues.ts         # createIssue, updateIssue, deleteIssue
â”‚   â”‚   â”œâ”€â”€ projects.ts       # createProject, updateProject, deleteProject
â”‚   â”‚   â”œâ”€â”€ members.ts        # inviteMember, removeMember
â”‚   â”‚   â””â”€â”€ auth.ts           # login, signup, logout
â”‚   â””â”€â”€ utils.ts
â”œâ”€â”€ hooks/                    # useProjects, useIssues, useMembers
â”œâ”€â”€ types/
â”‚   â””â”€â”€ database.ts           # Supabase generated types
â””â”€â”€ middleware.ts
```

---

## ðŸ—„ï¸ SUPABASE SETUP TEMPLATE

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Supabase Client â€” Browser (`lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Supabase Client â€” Server (`lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}
```

### Middleware (`middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

### Standard RLS Policies (apply to every table)
```sql
-- Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON [table_name]
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON [table_name]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON [table_name]
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON [table_name]
  FOR DELETE USING (auth.uid() = user_id);
```

---

## âœ… VALIDATION PATTERN (Client + Server)

### Zod Schema (`lib/validations/[feature].ts`)
```typescript
import { z } from 'zod'

// Define ONCE, use everywhere
export const createItemSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title must be under 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be under 500 characters')
    .optional(),
  // Add fields specific to your topic
})

export type CreateItemInput = z.infer<typeof createItemSchema>
```

### Server Action with Validation (`lib/actions/[feature].ts`)
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createItemSchema } from '@/lib/validations/[feature]'

export async function createItem(formData: unknown) {
  // 1. Server-side validation
  const parsed = createItemSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors }
  }

  // 2. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: { _global: ['Unauthorized'] } }

  // 3. Database operation
  const { error } = await supabase
    .from('items')
    .insert({ ...parsed.data, user_id: user.id })

  if (error) return { error: { _global: [error.message] } }

  revalidatePath('/dashboard')
  return { success: true }
}
```

### Form Component with Client Validation (`components/forms/CreateItemForm.tsx`)
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createItemSchema, type CreateItemInput } from '@/lib/validations/[feature]'
import { createItem } from '@/lib/actions/[feature]'
import { toast } from 'sonner'

export function CreateItemForm() {
  const form = useForm<CreateItemInput>({
    resolver: zodResolver(createItemSchema), // CLIENT-SIDE validation
    defaultValues: { title: '', description: '' },
  })

  async function onSubmit(data: CreateItemInput) {
    const result = await createItem(data) // SERVER-SIDE validation inside
    if (result?.error) {
      // Handle server errors
      if ('_global' in result.error) {
        toast.error(result.error._global?.[0])
      }
      return
    }
    toast.success('Created successfully!')
    form.reset()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium">Title</label>
        <input
          id="title"
          {...form.register('title')}
          className="mt-1 w-full rounded-md border px-3 py-2"
          aria-describedby="title-error"
        />
        {form.formState.errors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
            {form.formState.errors.title.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {form.formState.isSubmitting ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

---

## ðŸŽ¨ DESIGN SYSTEM

### Tailwind Config Additions (`tailwind.config.ts`)
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      }
    },
  },
  plugins: [],
}

export default config
```

### Design Checklist
- [ ] Consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)
- [ ] 2-3 brand colors max + neutrals
- [ ] Clear visual hierarchy (H1 > H2 > body > caption)
- [ ] Focus states on all interactive elements (accessibility)
- [ ] Hover states on all clickable elements
- [ ] Empty states for all list/table views
- [ ] Skeleton loaders for data fetching
- [ ] Toast notifications for all actions (success + error)
- [ ] Mobile hamburger menu if sidebar exists
- [ ] Consistent border-radius throughout

---

## ðŸ§ª TESTING STRATEGY

> **Yes, include tests â€” but be smart about what to test in 10 hours.**
> Tests demonstrate professionalism and catch regressions fast. Focus on **critical paths only**.

### Test Setup (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

### Test Setup File (`src/tests/setup.ts`)
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }),
}))
```

### Priority Tests to Write (in order)

**1. Validation Schemas â€” HIGHEST PRIORITY** (`src/tests/validations/[feature].test.ts`)
```typescript
import { describe, it, expect } from 'vitest'
import { createItemSchema } from '@/lib/validations/[feature]'

describe('createItemSchema', () => {
  it('accepts valid input', () => {
    const result = createItemSchema.safeParse({ title: 'Test Item', description: 'A description' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createItemSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
    expect(result.error?.flatten().fieldErrors.title).toBeDefined()
  })

  it('rejects title over 100 characters', () => {
    const result = createItemSchema.safeParse({ title: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})
```

**2. Critical UI Components** (`src/tests/components/[Component].test.tsx`)
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CreateItemForm } from '@/components/forms/CreateItemForm'

describe('CreateItemForm', () => {
  it('renders form fields', () => {
    render(<CreateItemForm />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup()
    render(<CreateItemForm />)
    await user.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls server action with valid data', async () => {
    const mockAction = vi.fn().mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<CreateItemForm onSubmit={mockAction} />)
    await user.type(screen.getByLabelText(/title/i), 'My Test Item')
    await user.click(screen.getByRole('button', { name: /create/i }))
    await waitFor(() => expect(mockAction).toHaveBeenCalledWith({ title: 'My Test Item' }))
  })
})
```

**3. Utility Functions** (`src/tests/lib/utils.test.ts`)
```typescript
import { describe, it, expect } from 'vitest'
import { formatDate, truncate } from '@/lib/utils'

describe('formatDate', () => {
  it('formats a date correctly', () => {
    expect(formatDate(new Date('2026-01-15'))).toBe('Jan 15, 2026')
  })
})
```

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

> **Rule**: Write validation tests FIRST (they're fast, pure, and prove your core logic works). Write component tests for the 2-3 most critical user flows. Skip tests for UI-only components.

---

## â±ï¸ 10-HOUR EXECUTION PLAN

```
Hour 1   â€” Setup & Architecture
  - Receive topic, define MVP scope (3 core features max)
  - Scaffold Next.js app, install dependencies
  - Set up Supabase project, design DB schema
  - Create GitHub repo, push initial commit

Hour 2   â€” Database & Auth
  - Write all Supabase migrations
  - Add RLS policies
  - Add seed data
  - Implement auth (login, signup, logout, middleware)

Hours 3â€“4 â€” Core Feature #1 (CRUD + Validation)
  - Zod schemas
  - Server Actions
  - Form components with validation
  - Data display component (table/list/cards)
  - Write validation tests

Hours 5â€“6 â€” Core Feature #2 + #3 (lean)
  - Repeat pattern from above for remaining features
  - Keep it simple â€” ship over perfect

Hour 7   â€” Design Polish
  - Consistent layout, header, sidebar/nav
  - Empty states, loading states, error states
  - Responsive mobile layout
  - Toast notifications

Hour 8   â€” Testing & Bug Fixes
  - Run all tests, fix failures
  - Manual QA on all flows
  - Fix critical bugs only

Hour 9   â€” Deploy & Seed
  - Push to GitHub
  - Deploy on Vercel (connect repo)
  - Set all environment variables on Vercel
  - Verify production build works
  - Add realistic seed data to Supabase

Hour 10  â€” Demo Video & Submission
  - Record 5-min demo (Loom recommended)
  - Write Product Hunt description
  - Submit all links on event platform
```

---

## ðŸŒ± SEED DATA TEMPLATE

```sql
-- Run in Supabase SQL editor after creating tables
-- Replace YOUR_USER_ID with your actual auth user ID

INSERT INTO projects (name, description, slug, owner_id) VALUES
  ('FlowBoard Demo', 'A sample project to showcase all features', 'flowboard-demo', 'YOUR_USER_ID');

-- Replace PROJECT_ID with the id from above insert
INSERT INTO issues (title, description, status, priority, project_id, reporter_id, created_at) VALUES
  ('Set up CI/CD pipeline', 'Configure GitHub Actions for automated deployment', 'todo', 'high', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '3 days'),
  ('Design login page', 'Create responsive login and signup pages', 'in_progress', 'medium', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '2 days'),
  ('Fix auth bug on mobile', 'Session not persisting on iOS Safari', 'in_review', 'urgent', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '1 day'),
  ('Write onboarding docs', 'Document the getting started guide', 'done', 'low', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '5 days'),
  ('Add dark mode support', 'Implement theme toggle across all pages', 'todo', 'medium', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '4 hours'),
  ('Performance audit', 'Run Lighthouse and fix issues above 90 score', 'in_progress', 'high', 'PROJECT_ID', 'YOUR_USER_ID', NOW() - INTERVAL '6 hours');
```

---

## ðŸš€ VERCEL DEPLOYMENT CHECKLIST

```bash
# Before deploying
- [ ] All .env.local vars added to Vercel project settings
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] SUPABASE_SERVICE_ROLE_KEY set (as secret)
- [ ] Supabase Auth redirect URLs include your Vercel domain
      (Supabase Dashboard â†’ Auth â†’ URL Configuration)
- [ ] Production build passes locally: npm run build
- [ ] No TypeScript errors: npm run type-check
```

---

## ðŸ“‹ PROMPTS TO USE WITH CLAUDE CLI

Copy-paste these during the hackathon. Replace placeholders before use.

### Prompt 1: Generate DB Schema
```
Given this SaaS app idea: Jira clone called FlowBoard â€” project management SaaS 
with Kanban board, issue tracking, comments, and team members.

Generate a complete Supabase PostgreSQL schema including:
- profiles (extends auth.users: full_name, avatar_url)
- projects (name, description, slug, owner_id)
- project_members (project_id, user_id, role: admin/member/viewer)
- issues (title, description, status: todo/in_progress/in_review/done,
  priority: low/medium/high/urgent, project_id, assignee_id,
  reporter_id, due_date, order_index)
- comments (issue_id, user_id, body)
- labels (name, color, project_id)
- issue_labels (issue_id, label_id)
- All tables with created_at/updated_at timestamps
- Foreign key relationships
- RLS policies for each table
- Indexes on all foreign keys
- TypeScript Database type definitions for Supabase
Output as one complete SQL migration file + TypeScript types.
```

### Prompt 2A: Board Feature (Kanban) â­ Hero Feature
```
Build the Kanban board feature for FlowBoard following HACKATHON_GLOBAL_PROMPT.md rules.
Files to create:
1. src/lib/validations/issue.ts â€” Zod schema (title, description, status, priority, assignee_id, due_date)
2. src/lib/actions/issues.ts â€” createIssue, updateIssue, updateIssueStatus, deleteIssue, getIssuesByProject
3. src/app/(dashboard)/dashboard/[projectSlug]/board/page.tsx â€” server component
4. src/components/board/KanbanBoard.tsx â€” drag-drop with @hello-pangea/dnd, 4 columns
5. src/components/board/IssueCard.tsx â€” title, color-coded priority badge, assignee avatar
6. src/components/board/IssueDetailDialog.tsx â€” full editor: title, description, status, priority, assignee, comments
7. src/components/board/CreateIssueDialog.tsx â€” create form with validation
8. src/tests/validations/issue.test.ts â€” vitest tests for Zod schema
Both client-side (zodResolver) and server-side (server action) validation required.
Create all files now.
```

### Prompt 2B: Issues List Feature
```
Build the issues list page for FlowBoard following HACKATHON_GLOBAL_PROMPT.md rules.
Files to create:
1. src/app/(dashboard)/dashboard/[projectSlug]/issues/page.tsx â€” server component
2. src/components/issues/IssuesTable.tsx â€” sortable table (title, status, priority, assignee, due date)
3. src/components/issues/IssueFilters.tsx â€” filter by status + priority using URL search params
4. src/components/issues/IssueStatusBadge.tsx â€” color-coded status badge
Empty state when no issues. Loading skeleton. Create all files now.
```

### Prompt 2C: Members Feature
```
Build the members management page for FlowBoard following HACKATHON_GLOBAL_PROMPT.md rules.
Files to create:
1. src/lib/validations/member.ts â€” Zod schema (email, role: admin/member/viewer)
2. src/lib/actions/members.ts â€” inviteMember, removeMember, updateMemberRole, getMembersByProject
3. src/app/(dashboard)/dashboard/[projectSlug]/members/page.tsx â€” server component
4. src/components/members/MembersList.tsx â€” table of members with role badge + remove button
5. src/components/members/InviteMemberForm.tsx â€” invite by email with role select
6. src/tests/validations/member.test.ts â€” vitest tests
Both client-side and server-side validation required. Create all files now.
```

### Prompt 2D: Settings Feature
```
Build the project settings page for FlowBoard following HACKATHON_GLOBAL_PROMPT.md rules.
Files to create:
1. src/lib/validations/project.ts â€” Zod schema (name, description, slug)
2. src/lib/actions/projects.ts â€” createProject, updateProject, deleteProject, getProjects, getProjectBySlug
3. src/app/(dashboard)/dashboard/page.tsx â€” projects grid for logged-in user
4. src/app/(dashboard)/dashboard/new-project/page.tsx â€” create project form
5. src/app/(dashboard)/dashboard/[projectSlug]/settings/page.tsx â€” edit name/description, danger zone delete
6. src/tests/validations/project.test.ts â€” vitest tests
Both client-side and server-side validation. Create all files now.
```

### Prompt 3: Auth Pages
```
Generate complete auth pages for my Next.js + Supabase app:
1. /app/(auth)/login/page.tsx â€” email + password login form
2. /app/(auth)/signup/page.tsx â€” signup with email, password, confirm password
3. Both with React Hook Form + Zod validation
4. Client-side validation messages shown inline
5. Server Action for each form
6. Redirect to /dashboard on success
7. Error handling with toast notifications
Match my global prompt's validation and styling patterns.
```

### Prompt 4: Dashboard Layout
```
Create a responsive dashboard layout for FlowBoard (Jira clone):
- Dark left sidebar with:
  - FlowBoard logo at top
  - Project switcher dropdown
  - Nav links per project: Board, Issues, Members, Settings
  - lucide-react icons for each nav item
- Top header: project name breadcrumb + user avatar dropdown (profile, sign out)
- Mobile: sidebar collapses to hamburger menu
- Active route highlighted in sidebar
- Main content area with consistent padding
Make it look like a professional SaaS â€” clean, modern, dark sidebar like Linear or Jira.
Create all layout files now.
```

### Prompt 5: Fix + Polish Pass
```
Review this component and:
1. Add any missing loading states
2. Add proper error handling with user-friendly messages
3. Ensure all interactive elements have hover + focus states
4. Make it fully responsive (mobile-first)
5. Add aria labels for accessibility
6. Check for any TypeScript errors
[PASTE COMPONENT CODE]
```

---

## âš¡ SHORTCUTS & TIME-SAVERS

### Use shadcn components to skip building from scratch
```bash
npx shadcn@latest add button input label form card table badge toast dialog
```

### Quick utility function (`lib/utils.ts`)
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str
}
```

### Reusable error component
```typescript
// components/ui/FormError.tsx
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
      {message}
    </p>
  )
}
```

### Reusable loading skeleton
```typescript
// components/ui/Skeleton.tsx
import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)} />
  )
}
```

---

## ðŸ”Œ MCP SERVERS AVAILABLE

Always use these MCP tools instead of asking me to do things manually.
**Never ask me to copy-paste SQL, push git commands, or click in dashboards.**

| MCP | Use For |
|---|---|
| **Supabase MCP** | Create tables, run migrations, insert seed data, add RLS policies, debug data |
| **Vercel MCP** | Deploy app, set env vars, check build logs, get live URL |
| **Context7 MCP** | Fetch latest docs for Next.js 16, Supabase SSR, any library â€” always do this before generating code |
| **GitHub MCP** | Create repo in Bacancy org, push code, create commits, monitor CI |
| **Next.js DevTools MCP** | Check live runtime errors, logs, routes â€” auto-connects when `npm run dev` is running |

### Windows â€” Start Codex (only GitHub token needed)
```powershell
# Supabase + Vercel use browser OAuth â€” no token needed
# Only GitHub requires a personal access token
$env:GITHUB_TOKEN = "your_github_personal_access_token"
cd C:\Users\admin\hackathon\[appname]
codex
```

> **First time only** â€” Supabase and Vercel will open a browser window
> automatically asking you to log in and authorize. Do this once and
> it's saved for all future sessions. No tokens needed for them.

### config.toml â€” Full MCP Configuration
Location: `C:\Users\admin\.codex\config.toml`
```toml
experimental_use_rmcp_client = true

[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp"
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.vercel]
url = "https://mcp.vercel.com/"
startup_timeout_sec = 120
tool_timeout_sec = 600

[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"

[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_TOKEN"
startup_timeout_sec = 120
tool_timeout_sec = 600
```

Get GitHub token â†’ github.com â†’ Settings â†’ Developer Settings â†’
Personal Access Tokens (Classic) â†’ Generate â†’ select scopes: `repo` + `workflow`

### Example Combined MCP Prompt
```
Using Context7 MCP: fetch latest Next.js 16 App Router + @supabase/ssr docs.
Using Supabase MCP: create the issues table with all columns and RLS policies, then insert seed data.
Using GitHub MCP: commit all new files with message "feat: add issues feature".
Now generate the complete Kanban board feature following those docs and my global prompt rules.
Using Vercel MCP: after I confirm code looks good, deploy and give me the live URL.
```

---

## âœ… FINAL SUBMISSION CHECKLIST

### Technical
- [ ] App deployed and accessible on Vercel URL
- [ ] Auth (signup, login, logout) working
- [ ] Kanban board with drag-drop between 4 columns â­
- [ ] Create/edit/delete issues with validation
- [ ] Issues list page with status + priority filters
- [ ] Members invite + remove working
- [ ] Project settings update + delete working
- [ ] Client-side validation on all forms (zodResolver)
- [ ] Server-side validation on all server actions (Zod)
- [ ] RLS policies active on all tables
- [ ] Seed data in Supabase (for demo)
- [ ] `npm run build` passes with 0 errors
- [ ] Vitest tests passing for all Zod schemas

### Product
- [ ] Landing page (even a simple one) at root `/`
- [ ] Clear value proposition visible above the fold
- [ ] Demo video recorded (5 min max â€” Loom)
- [ ] GitHub repo pushed to Bacancy org
- [ ] Product Hunt listing text ready

### Submission Links to Gather
- [ ] Live Vercel URL
- [ ] GitHub repo URL  
- [ ] Demo video URL (Loom)
- [ ] Product Hunt listing URL (post launch day)

---

*Good luck! Ship fast, validate everything, and make it look great.* ðŸš€

