<?php

namespace Wezlo\TabsPersistentes;

use Filament\Contracts\Plugin;
use Filament\Panel;
use Filament\Support\Facades\FilamentView;
use Filament\View\PanelsRenderHook;
use Illuminate\Contracts\View\View;

class WorkspaceTabsPlugin implements Plugin
{
    protected int $maxTabs = 20;

    protected string $persistKey = 'wezlo_tabs_persistentes';

    /** @var array<string> */
    protected array $excludeUrls = [];

    protected bool $contextMenuEnabled = true;

    protected bool $dragReorderEnabled = true;
    
    protected bool $autoCloseCreateTabsEnabled = true;

    protected bool $snapshotsEnabled = true;

    protected bool $scrollRestorationEnabled = true;

    public static function make(): static
    {
        return app(static::class);
    }

    public function getId(): string
    {
        return 'wezlo-tabs-persistentes';
    }

    public function maxTabs(int $maxTabs): static
    {
        $this->maxTabs = $maxTabs;

        return $this;
    }

    public function getMaxTabs(): int
    {
        return $this->maxTabs;
    }

    public function persistKey(string $persistKey): static
    {
        $this->persistKey = $persistKey;

        return $this;
    }

    public function getPersistKey(): string
    {
        return $this->persistKey;
    }

    public function excludeUrls(array $excludeUrls): static
    {
        $this->excludeUrls = $excludeUrls;

        return $this;
    }

    public function getExcludeUrls(): array
    {
        return $this->excludeUrls;
    }

    public function contextMenu(bool $condition = true): static
    {
        $this->contextMenuEnabled = $condition;

        return $this;
    }

    public function isContextMenuEnabled(): bool
    {
        return $this->contextMenuEnabled;
    }

    public function dragReorder(bool $condition = true): static
    {
        $this->dragReorderEnabled = $condition;

        return $this;
    }

    public function isDragReorderEnabled(): bool
    {
        return $this->dragReorderEnabled;
    }

    public function autoCloseCreateTabs(bool $condition = true): static
    {
        $this->autoCloseCreateTabsEnabled = $condition;

        return $this;
    }

    public function isAutoCloseCreateTabsEnabled(): bool
    {
        return $this->autoCloseCreateTabsEnabled;
    }

    public function snapshots(bool $condition = true): static
    {
        $this->snapshotsEnabled = $condition;

        return $this;
    }

    public function areSnapshotsEnabled(): bool
    {
        return $this->snapshotsEnabled;
    }

    public function scrollRestoration(bool $condition = true): static
    {
        $this->scrollRestorationEnabled = $condition;

        return $this;
    }

    public function isScrollRestorationEnabled(): bool
    {
        return $this->scrollRestorationEnabled;
    }

    public function register(Panel $panel): void {}

    public function getEncryptionKey(): string
    {
        if (! session()->has('wezlo_tabs_encryption_key')) {
            session()->put('wezlo_tabs_encryption_key', str()->random(32));
        }

        return session()->get('wezlo_tabs_encryption_key');
    }

    public function trackCurrentTab(): void
    {
        $url = request()->fullUrl();
        if ($this->isExcluded($url)) {
            return;
        }

        $tabs = session()->get('wezlo_tabs_open_urls', []);
        if (! in_array($url, $tabs)) {
            $tabs[] = $url;
            session()->put('wezlo_tabs_open_urls', $tabs);
        }
    }

    protected function isExcluded(string $url): bool
    {
        $path = parse_url($url, PHP_URL_PATH);
        foreach ($this->excludeUrls as $pattern) {
            if (str_starts_with($path, $pattern)) {
                return true;
            }
        }
        return false;
    }

    public function getOpenTabs(): array
    {
        return session()->get('wezlo_tabs_open_urls', []);
    }

    public function boot(Panel $panel): void
    {
        $this->trackCurrentTab();

        FilamentView::registerRenderHook(
            PanelsRenderHook::TOPBAR_AFTER,
            fn (): View => view('wezlo-tabs-persistentes::tab-bar', [
                'maxTabs' => $this->maxTabs,
                'persistKey' => $this->persistKey . '_' . $panel->getId(),
                'excludeUrls' => $this->excludeUrls,
                'enableContextMenu' => $this->contextMenuEnabled,
                'enableDragReorder' => $this->dragReorderEnabled,
                'autoCloseCreateTabs' => $this->autoCloseCreateTabsEnabled,
                'enableSnapshots' => $this->snapshotsEnabled,
                'enableScrollRestoration' => $this->scrollRestorationEnabled,
                'encryptionKey' => $this->getEncryptionKey(),
                'openTabs' => $this->getOpenTabs(),
            ]),
        );

        FilamentView::registerRenderHook(
            PanelsRenderHook::CONTENT_BEFORE,
            fn (): string => "@persist('tab-content-' . md5(request()->fullUrl()))<div>",
        );

        FilamentView::registerRenderHook(
            PanelsRenderHook::CONTENT_AFTER,
            fn (): string => "</div>@endpersist",
        );
    }
}
