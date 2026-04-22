<?php

namespace Wezlo\TabsPersistentes;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Assets\Css;
use Filament\Support\Facades\FilamentAsset;
use Spatie\LaravelPackageTools\Package;
use Spatie\LaravelPackageTools\PackageServiceProvider;

class WorkspaceTabsServiceProvider extends PackageServiceProvider
{
    public static string $name = 'wezlo-tabs-persistentes';

    public function configurePackage(Package $package): void
    {
        $package->name(static::$name)
            ->hasConfigFile()
            ->hasViews()
            ->hasTranslations();
    }

    public function packageBooted(): void
    {
        FilamentAsset::register([
            Css::make('workspace-tabs', __DIR__ . '/../resources/dist/workspace-tabs.css'),
            \Filament\Support\Assets\Js::make('workspace-tabs', __DIR__ . '/../resources/dist/workspace-tabs.js'),
        ], package: 'wezlo/wezlo-tabs-persistentes');

        \Illuminate\Support\Facades\Route::post('wezlo-tabs-persistentes/close', function (\Illuminate\Http\Request $request) {
            $url = $request->input('url');
            $tabs = session()->get('wezlo_tabs_open_urls', []);
            $tabs = array_values(array_filter($tabs, fn($t) => $t !== $url));
            session()->put('wezlo_tabs_open_urls', $tabs);
            return response()->json(['status' => 'ok']);
        })->name('wezlo-tabs-persistentes.close')->middleware(['web']);
    }
}
