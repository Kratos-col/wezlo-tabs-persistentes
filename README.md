# Filament Workspace Tabs

Browser-like tabs for Filament panels. Open multiple pages in tabs without losing context, drag to reorder, pin frequently accessed pages, and right-click for quick actions.

## Features

- **Tab per page** — Every navigation opens a new tab. Revisiting a URL activates the existing tab.
- **Drag to reorder** — Rearrange tabs via drag-and-drop (powered by SortableJS).
- **Pin tabs** — Double-click a tab to pin/unpin it. Pinned tabs can't be closed and stick to the left.
- **Context menu** — Right-click any tab for: Close, Close Others, Close to the Right, Duplicate, Pin/Unpin, Close All.
- **Recently closed** — Reopen closed tabs from the dropdown (last 50 stored).
- **Keyboard shortcuts** — `Ctrl+W` / `Cmd+W` to close the active tab.
- **Middle-click** — Middle-click or `Ctrl+click` sidebar links to open in a new tab.
- **Persistent** — Tabs survive page reloads via localStorage.
- **Dark mode** — Full support for Filament's dark mode.
- **SPA-ready** — Works with Filament's `->spa()` mode and Livewire's `wire:navigate`.

## Requirements

- PHP 8.2+
- Filament v4 or v5
- Laravel 11+

## Installation

```bash
composer require wezlo/filament-workspace-tabs
```

## Setup

### 1. Register the plugin

Add the plugin to your panel provider:

```php
use Wezlo\FilamentWorkspaceTabs\WorkspaceTabsPlugin;

public function panel(Panel $panel): Panel
{
    return $panel
        ->plugins([
            WorkspaceTabsPlugin::make(),
        ]);
}
```

### 2. Add the Tailwind source

Add the package views to your Filament theme CSS so Tailwind can scan utility classes:

```css
/* resources/css/filament/{panel}/theme.css */
@source '../../../../vendor/wezlo/filament-workspace-tabs/resources/views/**/*';
```

Then rebuild your frontend assets:

```bash
npm run build
```

## Configuration

All options are available as fluent methods on the plugin:

```php
WorkspaceTabsPlugin::make()
    ->maxTabs(25)                          // Maximum open tabs (default: 20)
    ->persistKey('my_tabs')                // localStorage key prefix (default: 'filament_workspace_tabs')
    ->excludeUrls(['/admin/login'])        // URL prefixes to never track as tabs
    ->contextMenu(false)                   // Disable right-click context menu
    ->dragReorder(false)                   // Disable drag-to-reorder
```

## Usage

Once installed, the tab bar appears below the topbar automatically.

| Action | Behavior |
|--------|----------|
| Click sidebar link | Opens a new tab |
| Click an existing tab | Switches to that tab (navigates to its URL) |
| Middle-click / Ctrl+click a link | Opens in a new tab without navigating |
| Close button (x) | Closes the tab |
| Double-click a tab | Pins / unpins the tab |
| Right-click a tab | Opens context menu |
| `Ctrl+W` / `Cmd+W` | Closes the active tab |
| Drag a tab | Reorders it |

### Pinned tabs

Pinned tabs display a pin icon alongside the label, have an indigo left border, and cannot be closed until unpinned. They always stay to the left of unpinned tabs.

### Context menu options

- **Close** — Close this tab (not available for pinned tabs)
- **Close Others** — Close all tabs except this one (respects pinned tabs)
- **Close to the Right** — Close all tabs to the right of this one
- **Duplicate** — Open the same URL in a new tab
- **Pin / Unpin** — Toggle the pinned state
- **Close All** — Close all unpinned tabs

### Recently closed

When tabs are closed, they're stored in a history list. Click the dropdown arrow on the right side of the tab bar to reopen any of the last 10 recently closed tabs.

## How it works

- Tab state (URLs, labels, order, pinned status) is stored client-side in `localStorage` using Alpine.js `$persist()`.
- Switching tabs triggers `Livewire.navigate()` for SPA-style page transitions.
- Page titles are automatically extracted from `document.title` on each navigation.
- The tab bar is injected via Filament's `TOPBAR_AFTER` render hook — no template modifications needed.
- The persist key is automatically scoped to the panel ID to avoid cross-panel tab bleed.

## Publishing config

```bash
php artisan vendor:publish --tag="filament-workspace-tabs-config"
```

## License

MIT
