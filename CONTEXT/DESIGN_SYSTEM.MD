# Aria Design System

A comprehensive design system built with Tailwind CSS v4, Radix UI primitives, and a custom color palette.

## Table of Contents

- [Colors](#colors)
- [Typography](#typography)
- [Icons](#icons)
- [Border Radius](#border-radius)
- [Spacing](#spacing)
- [Shadows](#shadows)
- [Components](#components)

---

## Colors

### Base Colors

```css
--color-bytebot-white: rgba(255, 255, 255, 1)
--color-bytebot-black: rgba(0, 0, 0, 1)
--color-bytebot-transparent: rgba(255, 255, 255, 0)
```

### Bronze Light Palette

Primary palette for light mode interfaces.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bytebot-bronze-light-1` | `rgba(251, 249, 249, 1)` | Lightest background |
| `--color-bytebot-bronze-light-2` | `rgba(246, 244, 244, 1)` | Secondary background |
| `--color-bytebot-bronze-light-3` | `rgba(241, 239, 238, 1)` | Tertiary background |
| `--color-bytebot-bronze-light-4` | `rgba(236, 233, 232, 1)` | Default background |
| `--color-bytebot-bronze-light-5` | `rgba(230, 225, 224, 1)` | Hover states |
| `--color-bytebot-bronze-light-6` | `rgba(224, 218, 217, 1)` | Active states |
| `--color-bytebot-bronze-light-7` | `rgba(218, 212, 210, 1)` | Borders |
| `--color-bytebot-bronze-light-8` | `rgba(209, 201, 199, 1)` | Subtle borders |
| `--color-bytebot-bronze-light-9` | `rgba(152, 141, 139, 1)` | Solid backgrounds |
| `--color-bytebot-bronze-light-10` | `rgba(141, 130, 128, 1)` | Hovered solid |
| `--color-bytebot-bronze-light-11` | `rgba(106, 99, 98, 1)` | Low contrast text |
| `--color-bytebot-bronze-light-12` | `rgba(45, 42, 42, 1)` | High contrast text |

### Bronze Dark Palette

Primary palette for dark mode interfaces.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bytebot-bronze-dark-1` | `rgba(19, 16, 16, 1)` | Darkest background |
| `--color-bytebot-bronze-dark-2` | `rgba(27, 25, 24, 1)` | Secondary background |
| `--color-bytebot-bronze-dark-3` | `rgba(37, 34, 33, 1)` | Tertiary background |
| `--color-bytebot-bronze-dark-4` | `rgba(45, 41, 40, 1)` | Component background |
| `--color-bytebot-bronze-dark-5` | `rgba(53, 48, 47, 1)` | Hover states |
| `--color-bytebot-bronze-dark-6` | `rgba(57, 51, 50, 1)` | Active states |
| `--color-bytebot-bronze-dark-7` | `rgba(77, 70, 69, 1)` | Borders |
| `--color-bytebot-bronze-dark-8` | `rgba(103, 94, 92, 1)` | Subtle borders |
| `--color-bytebot-bronze-dark-9` | `rgba(118, 107, 106, 1)` | Solid backgrounds |
| `--color-bytebot-bronze-dark-10` | `rgba(132, 121, 119, 1)` | Hovered solid |
| `--color-bytebot-bronze-dark-11` | `rgba(187, 178, 176, 1)` | Low contrast text |
| `--color-bytebot-bronze-dark-12` | `rgba(239, 238, 237, 1)` | High contrast text |

### Red Palette

Used for destructive actions, errors, and alerts.

#### Light Mode
| Token | Value |
|-------|-------|
| `--color-bytebot-red-light-1` | `rgba(255, 252, 252, 1)` |
| `--color-bytebot-red-light-2` | `rgba(255, 247, 247, 1)` |
| `--color-bytebot-red-light-3` | `rgba(254, 235, 236, 1)` |
| `--color-bytebot-red-light-9` | `rgba(229, 72, 77, 1)` |
| `--color-bytebot-red-light-11` | `rgba(206, 44, 49, 1)` |
| `--color-bytebot-red-light-12` | `rgba(100, 23, 35, 1)` |

#### Dark Mode
| Token | Value |
|-------|-------|
| `--color-bytebot-red-dark-1` | `rgba(23, 15, 14, 1)` |
| `--color-bytebot-red-dark-9` | `rgba(229, 72, 77, 1)` |
| `--color-bytebot-red-dark-11` | `rgba(255, 143, 139, 1)` |
| `--color-bytebot-red-dark-12` | `rgba(255, 210, 206, 1)` |

### Green Palette

Used for success states, confirmations, and positive actions.

| Token | Value |
|-------|-------|
| `--color-bytebot-green-1` | `rgba(251, 254, 250, 1)` |
| `--color-bytebot-green-2` | `rgba(245, 251, 244, 1)` |
| `--color-bytebot-green-3` | `rgba(232, 247, 228, 1)` |
| `--color-bytebot-green-9` | `rgba(77, 175, 41, 1)` |
| `--color-bytebot-green-11` | `rgba(43, 128, 0, 1)` |
| `--color-bytebot-green-12` | `rgba(33, 61, 24, 1)` |

### Semantic Colors

Colors mapped to specific UI purposes using OKLCH color space.

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `oklch(1 0 0)` | Page background |
| `--foreground` | `oklch(0.147 0.004 49.25)` | Primary text |
| `--primary` | `oklch(0.216 0.006 56.043)` | Primary actions |
| `--primary-foreground` | `oklch(0.985 0.001 106.423)` | Text on primary |
| `--secondary` | `oklch(0.97 0.001 106.424)` | Secondary actions |
| `--secondary-foreground` | `oklch(0.216 0.006 56.043)` | Text on secondary |
| `--muted` | `oklch(0.97 0.001 106.424)` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.553 0.013 58.071)` | Muted text |
| `--accent` | `oklch(0.97 0.001 106.424)` | Accent backgrounds |
| `--accent-foreground` | `oklch(0.216 0.006 56.043)` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Destructive actions |
| `--border` | `oklch(0.923 0.003 48.717)` | Border color |
| `--input` | `oklch(0.923 0.003 48.717)` | Input borders |
| `--ring` | `oklch(0.709 0.01 56.259)` | Focus rings |
| `--card` | `oklch(1 0 0)` | Card backgrounds |
| `--card-foreground` | `oklch(0.147 0.004 49.25)` | Card text |
| `--popover` | `oklch(1 0 0)` | Popover backgrounds |
| `--popover-foreground` | `oklch(0.147 0.004 49.25)` | Popover text |

---

## Typography

### Font Families

```css
--font-sans: Inter, system-ui, sans-serif
--font-mono: Geist Mono, monospace
```

**Primary Font:** Inter (Google Fonts)
- Imported with variable weights (100-900)
- Supports italic variants
- Optical sizing enabled (14-32)

### Font Sizes

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, captions |
| `text-sm` | 0.875rem (14px) | Body text, buttons |
| `text-base` | 1rem (16px) | Default body text |
| `text-lg` | 1.125rem (18px) | Subheadings |
| `text-xl` | 1.25rem (20px) | Headings |
| `text-2xl` | 1.5rem (24px) | Large headings |

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized text, labels |
| `font-semibold` | 600 | Headings, buttons |
| `font-bold` | 700 | Strong emphasis |

### Letter Spacing

```css
--letter-spacing-wide: 0.02em
--letter-spacing-normal: 0em
--letter-spacing-narrow: -0.01em
```

### Line Height

- `leading-none`: 1
- `leading-tight`: 1.25
- `leading-normal`: 1.5
- `leading-relaxed`: 1.625

---

## Icons

### Icon Libraries

1. **Hugeicons React** (Primary)
   - Package: `@hugeicons/react` v1.0.5
   - Core icons: `@hugeicons/core-free-icons` v1.0.14
   - Usage: `<HugeiconsIcon icon={ArrowDown01Icon} />`

2. **Lucide React** (Secondary)
   - Package: `lucide-react` v0.517.0
   - Usage: `<ChevronDown className="h-4 w-4" />`

3. **React Icons** (Supplementary)
   - Package: `react-icons` v5.6.0
   - Provides access to multiple icon sets

### Common Icons

| Icon | Library | Usage |
|------|---------|-------|
| `ArrowDown01Icon` | Hugeicons | Dropdowns, selects |
| `ArrowRight01Icon` | Hugeicons | Navigation, CTAs |
| `Tick01Icon` | Hugeicons | Checkboxes |
| `Tick02Icon` | Hugeicons | Select indicators |
| `ChevronDown` | Lucide | Accordions, menus |
| `Check` | Lucide | Confirmations |

### Icon Sizing

| Class | Size | Usage |
|-------|------|-------|
| `size-3` | 0.75rem (12px) | Tiny icons |
| `size-4` | 1rem (16px) | Default icons |
| `size-5` | 1.25rem (20px) | Medium icons |
| `size-6` | 1.5rem (24px) | Large icons |
| `size-8` | 2rem (32px) | Extra large icons |

---

## Border Radius

### Base Radius

```css
--radius: 0.625rem (10px)
```

### Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Small elements (badges, tags) |
| `--radius-md` | `8px` | Medium elements (inputs, buttons) |
| `--radius-lg` | `10px` | Large elements (cards, modals) |
| `--radius-xl` | `14px` | Extra large elements |

### Tailwind Classes

| Class | Radius | Usage |
|-------|--------|-------|
| `rounded-sm` | 0.125rem (2px) | Minimal rounding |
| `rounded` | 0.25rem (4px) | Subtle rounding |
| `rounded-md` | 0.375rem (6px) | Buttons, inputs |
| `rounded-lg` | 0.5rem (8px) | Cards, containers |
| `rounded-xl` | 0.75rem (12px) | Large cards |
| `rounded-2xl` | 1rem (16px) | Modals, dialogs |
| `rounded-full` | 9999px | Circular elements |

---

## Spacing

### Spacing Scale

Based on Tailwind's default 0.25rem (4px) scale.

| Class | Size | Pixels |
|-------|------|--------|
| `p-0.5` / `m-0.5` | 0.125rem | 2px |
| `p-1` / `m-1` | 0.25rem | 4px |
| `p-1.5` / `m-1.5` | 0.375rem | 6px |
| `p-2` / `m-2` | 0.5rem | 8px |
| `p-3` / `m-3` | 0.75rem | 12px |
| `p-4` / `m-4` | 1rem | 16px |
| `p-6` / `m-6` | 1.5rem | 24px |
| `p-8` / `m-8` | 2rem | 32px |

### Gap Scale

| Class | Size | Usage |
|-------|------|-------|
| `gap-1` | 0.25rem (4px) | Tight spacing |
| `gap-1.5` | 0.375rem (6px) | Compact spacing |
| `gap-2` | 0.5rem (8px) | Default spacing |
| `gap-4` | 1rem (16px) | Comfortable spacing |
| `gap-6` | 1.5rem (24px) | Generous spacing |

---

## Shadows

### Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | Custom | Subtle elevation |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Small elements |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1)` | Default shadow |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Cards, dropdowns |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Modals, popovers |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1)` | Large modals |

### Custom Shadow

```css
--shadow-bytebot: 0px 0px 0px 1.5px #FFF inset
```

Used for inner borders and highlights.

---

## Components

### Button

**Variants:**
- `default`: Primary action button
- `destructive`: Dangerous actions
- `outline`: Secondary actions
- `secondary`: Alternative actions
- `ghost`: Minimal styling
- `link`: Text-only button

**Sizes:**
- `sm`: Height 32px, compact padding
- `default`: Height 36px, standard padding
- `lg`: Height 40px, generous padding
- `icon`: Square 36x36px

**Design Tokens:**
```css
Base: rounded-md, text-sm, font-medium
Focus: ring-[3px], ring-ring/50
Disabled: opacity-50, pointer-events-none
```

**Example:**
```tsx
<Button variant="default" size="default">
  Click me
</Button>
```

---

### Card

**Structure:**
- `Card`: Container with border and shadow
- `CardHeader`: Top section with title
- `CardTitle`: Heading text
- `CardContent`: Main content area
- `CardFooter`: Bottom section for actions

**Design Tokens:**
```css
Container: rounded-xl, border, shadow-sm, gap-6, py-6
Background: bg-card
Text: text-card-foreground
```

**Example:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
</Card>
```

---

### Input

**Design Tokens:**
```css
Height: h-9 (36px)
Radius: rounded-md
Border: border-bytebot-bronze-light-7
Background: bg-transparent, dark:bg-input/30
Padding: px-3, py-1
Focus: ring-[3px], ring-ring/50, border-ring
Invalid: ring-destructive/20, border-destructive
```

**States:**
- Default: Transparent background with border
- Focus: Ring effect with border color change
- Invalid: Red ring and border
- Disabled: Opacity 50%, no pointer events

**Example:**
```tsx
<Input type="text" placeholder="Enter text..." />
```

---

### Select

**Components:**
- `SelectTrigger`: Dropdown trigger button
- `SelectContent`: Dropdown menu container
- `SelectItem`: Individual option
- `SelectLabel`: Section label
- `SelectSeparator`: Visual divider

**Design Tokens:**
```css
Trigger: h-6, rounded-md, border-bytebot-bronze-light-7
Content: rounded-md, shadow-md, animate-in/out
Item: text-[12px], rounded-sm, focus:bg-bytebot-bronze-light-5
Icon: ArrowDown01Icon, Tick02Icon
```

**Example:**
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

### Switch

**Design Tokens:**
```css
Container: h-[1.15rem], w-8, rounded-full
Thumb: size-4, rounded-full
Checked: bg-primary
Unchecked: bg-input
Focus: ring-[3px], ring-ring/50
```

**States:**
- Checked: Primary color background, thumb translated right
- Unchecked: Input color background, thumb at start
- Focus: Ring effect
- Disabled: Opacity 50%

**Example:**
```tsx
<Switch />
```

---

### Label

**Design Tokens:**
```css
Size: text-sm
Weight: font-medium
Line height: leading-none
Disabled: opacity-70, cursor-not-allowed
```

**Example:**
```tsx
<Label htmlFor="input">Label text</Label>
```

---

### Separator

**Design Tokens:**
```css
Horizontal: h-px, w-full
Vertical: w-px, h-full
Color: bg-border
```

**Example:**
```tsx
<Separator orientation="horizontal" />
```

---

### Dropdown Menu

**Components:**
- `DropdownMenuTrigger`: Opens the menu
- `DropdownMenuContent`: Menu container
- `DropdownMenuItem`: Individual menu item
- `DropdownMenuLabel`: Section label
- `DropdownMenuSeparator`: Visual divider
- `DropdownMenuCheckboxItem`: Checkable item
- `DropdownMenuRadioItem`: Radio selection item

**Design Tokens:**
```css
Content: rounded-md, shadow-md, border, p-1
Item: rounded-sm, px-2, py-1.5, text-sm
Focus: bg-accent, text-accent-foreground
Animation: fade-in/out, zoom-in/out, slide-in
```

---

### Popover

**Design Tokens:**
```css
Content: rounded-md, border, shadow-md, p-4
Background: bg-popover
Text: text-popover-foreground
Animation: fade-in/out, zoom-in/out
```

**Example:**
```tsx
<Popover>
  <PopoverTrigger>Open</PopoverTrigger>
  <PopoverContent>Content here</PopoverContent>
</Popover>
```

---

### Scroll Area

**Design Tokens:**
```css
Viewport: Scrollable container
Scrollbar: w-2.5, rounded-full
Thumb: bg-border, rounded-full
```

**Example:**
```tsx
<ScrollArea className="h-[200px]">
  <div>Scrollable content</div>
</ScrollArea>
```

---

### Loader

Custom loading indicator component.

**Design Tokens:**
```css
Animation: Spin or pulse animation
Size: Configurable via props
Color: Inherits from parent or theme
```

---

### Copy Button

Button component with copy-to-clipboard functionality.

**Design Tokens:**
```css
Base: Button component styles
Icon: Copy icon that changes on success
Feedback: Visual confirmation on copy
```

---

### Text Shimmer

Animated text effect component.

**Design Tokens:**
```css
Animation: Gradient shimmer effect
Background: Linear gradient animation
Duration: Configurable timing
```

---

### Pagination

Navigation component for paginated content.

**Design Tokens:**
```css
Container: flex, gap-1
Button: Button component with icon variant
Active: Primary color background
Disabled: Opacity 50%
```

---

## Animation & Effects

### Transitions

```css
transition-all: All properties
transition-colors: Color properties only
transition-transform: Transform properties only
```

### Animations

| Class | Effect |
|-------|--------|
| `animate-in` | Fade and scale in |
| `animate-out` | Fade and scale out |
| `fade-in` | Opacity 0 to 1 |
| `fade-out` | Opacity 1 to 0 |
| `zoom-in-95` | Scale from 95% |
| `zoom-out-95` | Scale to 95% |
| `slide-in-from-top` | Slide from top |
| `slide-in-from-bottom` | Slide from bottom |

### Glassmorphism

```css
backdrop-filter: blur(5px) saturate(100%)
background: rgba(255, 255, 255, 0.1)
```

---

## Focus States

All interactive components use consistent focus styling:

```css
focus-visible:border-ring
focus-visible:ring-ring/50
focus-visible:ring-[3px]
outline-none
```

**Invalid State:**
```css
aria-invalid:ring-destructive/20
aria-invalid:border-destructive
dark:aria-invalid:ring-destructive/40
```

---

## Dark Mode

Dark mode support is built into the system using CSS custom properties and the `dark:` variant.

**Implementation:**
```css
@custom-variant dark (&:is(.dark *));
```

**Usage:**
```tsx
<div className="bg-white dark:bg-gray-900">
  Content
</div>
```

---

## Accessibility

All components are built with accessibility in mind:

- Semantic HTML elements
- ARIA attributes where needed
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance

---

## Best Practices

1. **Use semantic color tokens** instead of direct color values
2. **Maintain consistent spacing** using the spacing scale
3. **Apply focus states** to all interactive elements
4. **Use appropriate font sizes** for hierarchy
5. **Leverage component variants** for consistency
6. **Test dark mode** for all new components
7. **Ensure accessibility** with proper ARIA labels
8. **Use icons consistently** from the primary library
9. **Apply shadows sparingly** for depth perception
10. **Follow animation guidelines** for smooth transitions

---

## Resources

- **Tailwind CSS v4**: https://tailwindcss.com
- **Radix UI**: https://www.radix-ui.com
- **Hugeicons**: https://hugeicons.com
- **Lucide Icons**: https://lucide.dev
- **Inter Font**: https://fonts.google.com/specimen/Inter

---

*Last updated: March 2026*
