# Dashboard Components Documentation

## Overview

The dashboard is a comprehensive video creation platform built with Next.js, React, and TypeScript. It provides a multi-step workflow for creating AI-generated music videos / videos with various customization options.

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── dashboard/           # Main dashboard pages
│   │   ├── layout.tsx      # Dashboard layout wrapper
│   │   ├── page.tsx        # Dashboard overview/home
│   │   ├── create/         # Video creation workflows
│   │   │   ├── page.tsx    # Creation hub
│   │   │   ├── music-clip/ # Music video creation
│   │   │   ├── automate/   # Automated video generation
│   │   │   └── script-video/ # Script-based videos
│   │   ├── projects/       # Project management
│   │   ├── analytics/      # Analytics dashboard
│   │   ├── settings/       # User settings
│   │   └── videomaking/    # Advanced video editor
│   └── globals.css         # Global styles and design system
├── components/
│   ├── generator/          # Step-by-step video creation components
│   │   ├── step-upload.tsx    # Music upload/generation
│   │   ├── step-settings.tsx  # Video type and style selection
│   │   ├── step-prompt.tsx    # AI prompt generation
│   │   ├── step-settings.tsx  # Final configuration
│   │   ├── step-generating.tsx # Generation progress
│   │   └── step-preview.tsx   # Video preview and download
│   ├── ui/                # Reusable UI components
│   └── clipizy-generator.tsx # Main generator component
└── contexts/              # React contexts
```

## Component Organization

### 1. Dashboard Layout (`src/app/dashboard/layout.tsx`)

**Purpose**: Provides the main dashboard structure with sidebar navigation and responsive design.

**Key Features**:
- Fixed sidebar with navigation icons
- Mobile-responsive with overlay sidebar
- Protected route wrapper
- User authentication integration

**Styling**: Uses Tailwind CSS with custom sidebar styling and responsive breakcredits.

### 2. Dashboard Pages

#### Main Dashboard (`src/app/dashboard/page.tsx`)
- **Stats Grid**: Displays key metrics (total videos, views, processing time, active projects)
- **Quick Actions**: Direct links to common tasks
- **Recent Projects**: Video thumbnails with status badges
- **Featured Content**: Promotional sections for new features

#### Creation Workflows (`src/app/dashboard/create/`)
- **Music Clip Creation** (`music-clip/page.tsx`): Multi-step music video creation
- **Automation** (`automate/page.tsx`): Automated video generation workflows
- **Script Video** (`script-video/page.tsx`): Script-based video creation

### 3. Generator Components (`src/components/generator/`)

#### Step Upload (`step-upload.tsx`)
**Purpose**: Handles music input - either file upload or AI generation.

**Features**:
- Drag & drop file upload
- AI music generation with Stable Audio
- Advanced settings (duration, model selection)
- File validation and error handling

**Styling**: Uses gradient backgrounds, hover effects, and responsive design.

#### Step Settings (`step-settings.tsx`)
**Purpose**: Video type and style configuration.

**Features**:
- Video type selection (static, animated loop, scenes)
- Budget slider with cost calculation
- **Enhanced Style Selection**: Full-screen modal with 10 focused visual styles
- **Interactive Style Cards**: Square cards with icons, titles, and single keywords
- **Custom Style Creation**: Dedicated section for creating unique styles
- Real-time cost updates

**Styling**:
- **Full-Screen Modal**: Modern overlay with backdrop blur and rounded corners
- **Square Style Cards**: Compact square cards with gradient backgrounds and centered content
- **Interactive Elements**: Selection indicators and smooth transitions
- **Keyword System**: Single descriptive keyword for each style
- **Minimal Layout**: Title and tags only, no descriptions

#### Step Prompt (`step-prompt.tsx`)
**Purpose**: AI-powered description generation for music and video.

**Features**:
- Music description textarea
- Video description textarea
- AI analysis with waveform visualization
- Random prompt generation
- Form validation

**Styling**: Clean form layout with AI gradient buttons and loading states.

#### Step settings (`step-settings.tsx`)
**Purpose**: Final configuration before video generation.

**Features**:
- Channel animation upload
- Audio visualizer selection (7 types)
- Visualizer positioning and sizing
- Audio synchronization options

**Styling**: Full-screen modals, grid layouts, and interactive previews.

#### Step Generating (`step-generating.tsx`)
**Purpose**: Shows generation progress and status.

**Features**:
- Progress indicators
- Status messages
- Loading animations

#### Step Preview (`step-preview.tsx`)
**Purpose**: Displays final video and download options.

**Features**:
- Video player with controls
- Download functionality
- Reset/restart options

### 4. UI Components (`src/components/ui/`)

Comprehensive set of reusable components including:
- **Form Components**: Input, Textarea, Select, Checkbox, RadioGroup
- **Layout Components**: Card, Sheet, Dialog, Tabs
- **Interactive Components**: Button, Slider, Progress, Badge
- **Navigation Components**: Sidebar, DropdownMenu, Menubar
- **Feedback Components**: Toast, Alert, Skeleton

## Styling System

### Global Styles (`src/app/globals.css`)

The styling system is built on Tailwind CSS with extensive custom CSS variables and utility classes.

#### Design Tokens

**Color System**:
```css
/* Brand Colors */
--brand-primary: 207 90% 68%     /* Blue */
--brand-secondary: 261 48% 63%   /* Purple */
--brand-accent: 280 100% 70%     /* Pink */

/* AI Theme Colors */
--ai-cyan: 180 100% 50%
--ai-purple: 280 100% 70%
--ai-pink: 320 100% 70%
```

**Spacing & Layout**:
```css
--radius: 0.75rem              /* Border radius */
--spacing-xs: 0.25rem          /* 4px */
--spacing-sm: 0.5rem           /* 8px */
--spacing-md: 1rem             /* 16px */
--spacing-lg: 1.5rem           /* 24px */
```

#### Custom CSS Classes

**Gradients**:
- `.gradient-primary`: Brand gradient (blue to purple)
- `.gradient-ai`: AI-themed gradient (cyan to pink)
- `.gradient-text`: Text with gradient background

**Buttons**:
- `.btn-primary`: Primary action button
- `.btn-gradient`: Gradient background button
- `.btn-ai-gradient`: Animated AI gradient button
- `.btn-secondary-hover`: Dark hover effect

**Cards & Layout**:
- `.card-modern`: Modern card with shadow and hover effects
- `.card-glow`: Card with glow effect on hover
- `.clickable-card`: Interactive card styling

**Animations**:
- `.fade-in`, `.fade-in-up`, `.fade-in-down`: Fade animations
- `.slide-in-left`, `.slide-in-right`: Slide animations
- `.scale-in`: Scale animation

#### Responsive Design

The system uses Tailwind's responsive prefixes:
- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)
- `xl:` - Extra large screens (1280px+)

#### Dark Mode Support

All components support dark mode through CSS custom properties that change based on the `.dark` class.

## Component Patterns

### 1. Form Management
- Uses `react-hook-form` with Zod validation
- Consistent error handling and validation messages
- Real-time form state updates

### 2. State Management
- Local state with `useState` for component-specific data
- Context providers for global state (auth, theme)
- Custom hooks for complex logic

### 3. File Handling
- Drag & drop interfaces
- File type validation
- Progress indicators for uploads

### 4. AI Integration
- Async operations with loading states
- Error handling and user feedback
- Fallback options for AI failures

## Usage Examples

### Creating a New Generator Step

```tsx
// 1. Define the component interface
type StepExampleProps = {
  form: UseFormReturn<z.infer<typeof ExampleSchema>>;
  onSubmit: (values: z.infer<typeof ExampleSchema>) => void;
  onBack: () => void;
};

// 2. Use consistent styling patterns
export function StepExample({ form, onSubmit, onBack }: StepExampleProps) {
  return (
    <Card className="w-full animate-fade-in-up bg-card border border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">
          Step Title
        </CardTitle>
        <CardDescription className="text-muted-foreground text-base">
          Step description
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form content */}
      </CardContent>
    </Card>
  );
}
```

### Using Custom Styling Classes

```tsx
// Gradient buttons
<Button className="btn-gradient">Primary Action</Button>
<Button className="btn-ai-gradient">AI Action</Button>

// Cards with effects
<Card className="card-modern">Standard Card</Card>
<Card className="card-glow">Glowing Card</Card>

// Animated elements
<div className="fade-in-up">Animated Content</div>
```

## Best Practices

1. **Consistent Styling**: Always use the predefined CSS classes and design tokens
2. **Responsive Design**: Test on multiple screen sizes using Tailwind breakcredits
3. **Accessibility**: Include proper ARIA labels and keyboard navigation
4. **Error Handling**: Provide clear error messages and fallback states
5. **Loading States**: Show progress indicators for async operations
6. **Form Validation**: Use Zod schemas for type-safe validation
7. **Component Composition**: Build complex UIs by combining smaller components

## Development Workflow

1. **Component Creation**: Start with the UI component structure
2. **Styling**: Apply Tailwind classes and custom CSS as needed
3. **State Management**: Add form handling and local state
4. **Integration**: Connect to parent components and data flows
5. **Testing**: Test responsive design and user interactions
6. **Documentation**: Update this README with new patterns

## File Locations Summary

- **Dashboard Layout**: `src/app/dashboard/layout.tsx`
- **Main Dashboard**: `src/app/dashboard/page.tsx`
- **Generator Steps**: `src/components/generator/`
- **UI Components**: `src/components/ui/`
- **Global Styles**: `src/app/globals.css`
- **Type Definitions**: `src/components/clipizy-generator.tsx` (types section)
- **Configuration**: `src/lib/config.ts`

This documentation provides a comprehensive overview of the dashboard component architecture, styling system, and development patterns used throughout the application.
