@php
    $currentUrl = request()->getRequestUri();
    $isExcluded = false;
    foreach ($excludeUrls as $pattern) {
        if (str_starts_with($currentUrl, $pattern)) {
            $isExcluded = true;
            break;
        }
    }
@endphp

@if ($isExcluded)
    <div
        x-data="workspaceTabs({
            persistKey: @js($persistKey),
            excludeUrls: @js($excludeUrls),
            maxTabs: 1,
            enableContextMenu: false,
            enableDragReorder: false,
            autoCloseCreateTabs: false,
            enableSnapshots: false,
            enableScrollRestoration: false,
        })"
        style="display: none;"
    >
    </div>
@endif
