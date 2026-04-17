<?php

namespace Wezlo\FilamentWorkspaceTabs\Tests\Feature;

use Wezlo\FilamentWorkspaceTabs\WorkspaceTabsServiceProvider;

it('registers the service provider', function () {
    expect(app()->getProvider(WorkspaceTabsServiceProvider::class))->not->toBeNull();
});

it('can load the tab bar view', function () {
    $view = view('filament-workspace-tabs::tab-bar', [
        'maxTabs' => 20,
        'persistKey' => 'test_key',
        'excludeUrls' => [],
        'enableContextMenu' => true,
        'enableDragReorder' => true,
    ]);

    expect($view->render())->toContain('fi-workspace-tabs');
});
