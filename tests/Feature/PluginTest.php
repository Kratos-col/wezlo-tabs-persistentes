<?php

use Wezlo\TabsPersistentes\WorkspaceTabsPlugin;

it('can instantiate the plugin', function () {
    $plugin = new WorkspaceTabsPlugin();
    expect($plugin)->toBeInstanceOf(WorkspaceTabsPlugin::class);
    expect($plugin->getId())->toBe('wezlo-tabs-persistentes');
});

it('can configure max tabs', function () {
    $plugin = new WorkspaceTabsPlugin();
    $plugin->maxTabs(50);
    expect($plugin->getMaxTabs())->toBe(50);
});

it('can configure persist key', function () {
    $plugin = new WorkspaceTabsPlugin();
    $plugin->persistKey('custom_key');
    expect($plugin->getPersistKey())->toBe('custom_key');
});

it('can configure excluded urls', function () {
    $plugin = new WorkspaceTabsPlugin();
    $plugin->excludeUrls(['/admin/test']);
    expect($plugin->getExcludeUrls())->toContain('/admin/test');
});

it('can toggle features', function () {
    $plugin = new WorkspaceTabsPlugin();
    
    // Context Menu
    $plugin->contextMenu(false);
    expect($plugin->isContextMenuEnabled())->toBeFalse();
    $plugin->contextMenu(true);
    expect($plugin->isContextMenuEnabled())->toBeTrue();

    // Drag Reorder
    $plugin->dragReorder(false);
    expect($plugin->isDragReorderEnabled())->toBeFalse();
    $plugin->dragReorder(true);
    expect($plugin->isDragReorderEnabled())->toBeTrue();
});
