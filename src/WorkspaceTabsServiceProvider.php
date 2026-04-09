<?php

namespace Wezlo\FilamentWorkspaceTabs;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class WorkspaceTabsServiceProvider extends PackageServiceProvider
{
    public static string $name = 'filament-workspace-tabs';

    public function configurePackage(Package $package): void
    {
        $package->name(static::$name)
            ->hasConfigFile()
            ->hasViews();
    }

    public function packageBooted(): void
    {
        FilamentAsset::register([
            Css::make('workspace-tabs', __DIR__ . '/../resources/dist/workspace-tabs.css'),
            AlpineComponent::make('workspace-tabs', __DIR__ . '/../resources/dist/workspace-tabs.js'),
        ], package: 'wezlo/filament-workspace-tabs');
    }
}
