<?php

use Wezlo\TabsPersistentes\WorkspaceTabsServiceProvider;

it('registers the service provider', function () {
    expect(app()->getProvider(WorkspaceTabsServiceProvider::class))->not->toBeNull();
});

it('renders the tab bar with premium assets and new features', function () {
    $view = view('wezlo-tabs-persistentes::tab-bar', [
        'maxTabs' => 12,
        'persistKey' => 'wezlo_tabs',
        'excludeUrls' => ['/admin/login'],
        'enableContextMenu' => true,
        'enableDragReorder' => true,
        'translations' => ['new_tab' => 'Custom New Tab Label'],
    ]);

    $html = $view->render();

    // 1. Check for the main container and premium classes
    expect($html)->toContain('fi-workspace-tabs');
    expect($html)->toContain('fi-workspace-tabs-strip');

    // 2. Check for the new Icon support templates (Aesthetics & Icons)
    expect($html)->toContain('fi-workspace-tab-icon');
    expect($html)->toContain(':src="tab.icon"');
    
    // 3. Check for the handle and draggable classes (Drag & Reorder)
    expect($html)->toContain('fi-workspace-tab');
    
    // 4. Check for the configuration/translations being passed (Logic)
    expect($html)->toContain('wezlo_tabs');
    expect($html)->toContain('Custom New Tab Label');
    
    // 5. Verify the existence of the Context Menu and Dropdown (Feature Complete)
    expect($html)->toContain('fi-workspace-tabs-context-menu');
    expect($html)->toContain('fi-workspace-tabs-closed-menu');
});
