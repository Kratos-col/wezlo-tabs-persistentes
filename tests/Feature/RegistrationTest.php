<?php

namespace Wezlo\TabsPersistentes\Tests\Feature;

use Wezlo\TabsPersistentes\WorkspaceTabsServiceProvider;

it('registers the service provider', function () {
    expect(app()->getProvider(WorkspaceTabsServiceProvider::class))->not->toBeNull();
});

it('can load the tab bar view', function () {
    $view = view('wezlo-tabs-persistentes::tab-bar', [
        'maxTabs' => 20,
        'persistKey' => 'test_key',
        'excludeUrls' => [],
        'enableContextMenu' => true,
        'enableDragReorder' => true,
    ]);

    expect($view->render())->toContain('fi-workspace-tabs');
});
