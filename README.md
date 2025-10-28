# Tudari - Productivity & Learning Platform

A comprehensive productivity and learning management application built with modern web technologies. Tudari helps users organize their tasks, take notes with AI-powered features, track productivity, and manage projects effectively.

## 🚀 Technical Stack

### Frontend
- **React 18** - UI library for building interactive interfaces
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Next-generation frontend build tool
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality React component library
- **React Router DOM** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Fabric.js** - Canvas drawing and manipulation
- **Framer Motion** - Animation library
- **Zustand** - State management
- **date-fns** - Date manipulation utilities
- **Sonner** - Toast notifications
- **Lucide React** - Icon library

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** - Relational database
- **Row Level Security (RLS)** - Data access control
- **Edge Functions** - Serverless backend logic
- **Authentication** - Email-based user authentication
- **Real-time subscriptions** - Live data updates

### AI Integration
- **Lovable AI Gateway** - AI model access without API keys
- Supported Models:
  - `google/gemini-2.5-pro` - Advanced reasoning and multimodal tasks
  - `google/gemini-2.5-flash` - Balanced performance
  - `openai/gpt-5` - High-accuracy general tasks
  - `openai/gpt-5-mini` - Cost-effective reasoning

## 📋 Features

### 1. Task Management
- Create, update, delete tasks
- Set priorities (low, medium, high)
- Assign due dates
- Track task status (todo, in-progress, completed)
- Link tasks to projects
- Real-time task updates

### 2. Note-Making with Canvas
- **Canvas Drawing**:
  - Multiple tools: pen, pencil, highlighter, eraser
  - Color picker with preset colors
  - Adjustable brush sizes
  - Gridded canvas background
  - Image import functionality
  - Stroke persistence
- **Text Notes**: Rich text editing
- **AI Features**:
  - Generate summaries using AI
  - Create quizzes from notes
  - Attempt and score quizzes
- **Organization**: Folder-based note grouping
- Export notes as text files

### 3. Productivity Tracking
- Daily productivity scores
- Metrics tracked:
  - Notes created
  - Tasks completed
  - Study time intensity
  - Quiz performance
- Streak tracking (increments when daily score > 10)
- Productivity charts and visualizations
- Historical data analysis

### 4. Project Management
- Create and manage projects
- Link tasks to specific projects
- Project board with task cards
- Drag-and-drop task organization
- Project descriptions and metadata

### 5. Activity Logging
- Log study sessions with:
  - Topic
  - Date and time range
  - Intensity level (1-10)
  - Optional notes
- View all logs with filtering
- Daily and weekly summaries

### 6. User Profile
- Update username and display name
- Set weekly free time slots
- Email management
- Avatar support
- Profile customization

## 🗄️ Database Schema

### Tables

#### `profiles`
- User profile information
- Columns: `id`, `username`, `email`, `name`, `avatar_url`, `free_time`, `created_at`, `updated_at`

#### `tasks`
- Task management
- Columns: `id`, `user_id`, `title`, `description`, `status`, `priority`, `due_date`, `project_id`, `completed_at`, `created_at`, `updated_at`

#### `notes`
- Note storage with canvas data
- Columns: `id`, `user_id`, `title`, `text_content`, `strokes` (JSONB), `images` (JSONB), `summary`, `quiz_id`, `folder`, `content_type`, `created_at`, `updated_at`

#### `projects`
- Project information
- Columns: `id`, `user_id`, `title`, `description`, `created_at`, `updated_at`

#### `logs`
- Activity logging
- Columns: `id`, `user_id`, `topic`, `date`, `day`, `start_time`, `end_time`, `intensity`, `note`, `created_at`

#### `productivity`
- Daily productivity metrics
- Columns: `id`, `user_id`, `date`, `notes_count`, `logs_intensity_total`, `tasks_completed`, `quiz_score`, `score`, `streak`, `created_at`

#### `quizzes`
- AI-generated quizzes
- Columns: `id`, `user_id`, `note_id`, `questions` (JSONB), `created_at`

#### `quiz_results`
- Quiz attempt results
- Columns: `id`, `user_id`, `quiz_id`, `score`, `total_questions`, `answers` (JSONB), `completed_at`

#### `rewards`
- Achievement system
- Columns: `id`, `user_id`, `name`, `type`, `description`, `unlocked_at`

### Row Level Security (RLS)
All tables have RLS policies ensuring users can only access their own data:
- `auth.uid() = user_id` pattern used throughout
- Policies for SELECT, INSERT, UPDATE, DELETE operations
- Some tables restrict certain operations (e.g., rewards are insert-only)

## 🔧 Edge Functions

### `calculate-productivity`
- Calculates daily productivity scores
- Aggregates metrics from multiple sources:
  - Counts notes created
  - Sums task completions
  - Totals log intensity
  - Includes quiz scores
- Updates streak based on daily performance
- Automatically triggered on data changes

### `process-note`
- Handles AI operations on notes
- Actions:
  - `summarize`: Generate AI summary of note content
  - `generate-quiz`: Create quiz questions from note
- Uses Lovable AI Gateway
- Returns processed data to frontend

## 🎨 Design System

### Color Palette
- **Primary**: Soft blue (`hsl(217 91% 60%)`)
- **Secondary**: Warm beige (`hsl(38 40% 88%)`)
- **Accent**: Deep teal (`hsl(180 65% 45%)`)
- **Pine**: Forest green (`hsl(160 50% 35%)`)
- **Amber**: Warm amber (`hsl(38 90% 55%)`)
- **Success**: Green (`hsl(142 76% 45%)`)

### Gradients
- `gradient-primary`: Blue gradient
- `gradient-warm`: Warm beige to cream
- `gradient-hero`: Blue to teal
- `gradient-subtle`: Light background gradient
- `gradient-pine`: Forest green gradient
- `gradient-amber`: Warm amber gradient

### Shadows
- `shadow-soft`: Subtle elevation
- `shadow-medium`: Standard depth
- `shadow-strong`: Strong elevation
- `shadow-glow`: Glowing effect

## 📡 API Integrations

### Authentication Flow
```typescript
// Sign Up
const { data, error } = await supabase.auth.signUp({
  email: email,
  password: password,
  options: {
    data: { username }
  }
});

// Sign In
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Get Current User
const { data: { user } } = await supabase.auth.getUser();
```

### Data Operations
```typescript
// Create
const { data, error } = await supabase
  .from('tasks')
  .insert({ title, user_id, status: 'todo' })
  .select()
  .single();

// Read
const { data, error } = await supabase
  .from('notes')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });

// Update
const { error } = await supabase
  .from('tasks')
  .update({ status: 'completed', completed_at: new Date() })
  .eq('id', taskId);

// Delete
const { error } = await supabase
  .from('notes')
  .delete()
  .eq('id', noteId);
```

### Edge Function Invocation
```typescript
const { data, error } = await supabase.functions.invoke('process-note', {
  body: { 
    noteId: id, 
    action: 'summarize' 
  }
});
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm installed
- Git

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables
All environment variables are automatically configured through Lovable Cloud:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anonymous key
- `VITE_SUPABASE_PROJECT_ID` - Project identifier

## 📁 Project Structure

```
tudari/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # shadcn/ui components
│   │   └── DeleteNoteDialog.tsx
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # Backend integrations
│   │   └── supabase/    # Supabase client & types
│   ├── lib/             # Utility functions
│   ├── pages/           # Route components
│   │   ├── Auth.tsx
│   │   ├── Home.tsx
│   │   ├── Notes.tsx
│   │   ├── NoteEditor.tsx
│   │   ├── Tasks.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectBoard.tsx
│   │   ├── Logs.tsx
│   │   ├── Productivity.tsx
│   │   └── Profile.tsx
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles & design tokens
├── supabase/
│   ├── functions/       # Edge functions
│   │   ├── calculate-productivity/
│   │   └── process-note/
│   ├── migrations/      # Database migrations
│   └── config.toml      # Supabase configuration
├── public/              # Static assets
├── tailwind.config.ts   # Tailwind configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## 🔒 Security

- Row Level Security (RLS) enabled on all tables
- User data isolation enforced at database level
- Authentication required for all operations
- Secure edge function execution
- No API keys required for AI features

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Linting
```bash
npm run lint
```

## 📱 Responsive Design

The application is fully responsive and works across:
- Desktop (1920px+)
- Laptop (1280px - 1920px)
- Tablet (768px - 1280px)
- Mobile (320px - 768px)

## 🎯 Key Features Implementation

### Canvas Drawing
- Uses native HTML5 Canvas API
- Stores strokes as JSON in database
- Supports multiple drawing tools
- Real-time stroke rendering
- Grid background for better alignment

### AI Integration
- Serverless AI processing via edge functions
- No API key management required
- Multiple model support for different use cases
- Streaming responses for better UX

### Productivity Calculation
- Automated daily score calculation
- Multi-metric aggregation
- Streak management
- Historical data tracking

## 📄 License

This project is built with Lovable and uses the MIT License.

## 🤝 Contributing

This is a personal productivity project. For suggestions or issues, please open an issue in the repository.

## 📞 Support

For support with Lovable features, visit [docs.lovable.dev](https://docs.lovable.dev)

---

Built with ❤️ using Lovable, React, and Supabase
