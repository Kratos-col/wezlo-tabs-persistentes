<div
    x-load
    x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('workspace-tabs', 'wezlo/filament-workspace-tabs') }}"
    x-data="workspaceTabs({
        maxTabs: @js($maxTabs),
        persistKey: @js($persistKey),
        excludeUrls: @js($excludeUrls),
        enableContextMenu: @js($enableContextMenu),
        enableDragReorder: @js($enableDragReorder),
        translations: @js([
            'new_tab' => __('filament-workspace-tabs::tabs.new_tab'),
            'loading' => __('filament-workspace-tabs::tabs.loading'),
        ]),
    })"
    class="fi-workspace-tabs"
>
    {{-- Scroll left button --}}
    <button
        x-show="canScrollLeft"
        x-on:click="scrollLeft()"
        type="button"
        class="fi-workspace-tabs-scroll-btn fi-workspace-tabs-scroll-left"
    >
        <x-filament::icon
            icon="heroicon-m-chevron-left"
            class="size-4"
        />
    </button>

    {{-- Tab strip --}}
    <div
        x-ref="tabStrip"
        x-on:scroll.debounce.100ms="updateScrollState()"
        x-init="$nextTick(() => updateScrollState())"
        class="fi-workspace-tabs-strip"
    >
        <template x-for="tab in sortedTabs" :key="tab.id">
            <div
                class="fi-workspace-tab"
                :class="{
                    'fi-workspace-tab-active': tab.id === activeTabId,
                    'fi-workspace-tab-pinned': tab.pinned,
                }"
                :data-tab-id="tab.id"
                x-on:click="switchTab(tab.id)"
                x-on:contextmenu="openContextMenu($event, tab.id)"
                x-on:auxclick.prevent="if ($event.button === 1 && !tab.pinned) closeTab(tab.id)"
                x-on:dblclick="pinTab(tab.id)"
                role="tab"
                :aria-selected="tab.id === activeTabId"
                :title="tab.label"
            >
                {{-- Pin icon for pinned tabs --}}
                <template x-if="tab.pinned">
                    <svg class="fi-workspace-tab-pin-icon size-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.504l-2.879 1.44a.75.75 0 0 0 .758 1.292l2.621-1.31V15.25a.75.75 0 0 0 1.5 0v-4.504l2.879-1.44a.75.75 0 1 0-.758-1.292l-2.621 1.31V4.75Z" />
                    </svg>
                </template>

                {{-- Tab label --}}
                <span
                    x-text="tab.label"
                    class="fi-workspace-tab-label"
                ></span>

                {{-- Close button (not for pinned tabs) --}}
                <template x-if="!tab.pinned">
                    <button
                        x-on:click.stop="closeTab(tab.id)"
                        type="button"
                        class="fi-workspace-tab-close"
                    >
                        <svg class="size-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                    </button>
                </template>
            </div>
        </template>
    </div>

    {{-- Scroll right button --}}
    <button
        x-show="canScrollRight"
        x-on:click="scrollRight()"
        type="button"
        class="fi-workspace-tabs-scroll-btn fi-workspace-tabs-scroll-right"
    >
        <x-filament::icon
            icon="heroicon-m-chevron-right"
            class="size-4"
        />
    </button>

    {{-- Recently closed dropdown --}}
    <div class="fi-workspace-tabs-actions" x-show="closedTabs.length > 0">
        <div class="relative">
            <button
                x-on:click="showClosedMenu = !showClosedMenu"
                type="button"
                class="fi-workspace-tabs-closed-btn"
                title="{{ __('filament-workspace-tabs::tabs.recently_closed') }}"
            >
                <svg class="size-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
            </button>

            <div
                x-show="showClosedMenu"
                x-on:click.outside="showClosedMenu = false"
                x-transition
                class="fi-workspace-tabs-closed-menu"
            >
                <div class="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {{ __('filament-workspace-tabs::tabs.recently_closed') }}
                </div>
                <template x-for="(closed, index) in closedTabs.slice(0, 10)" :key="index">
                    <button
                        x-on:click="reopenTab(index)"
                        type="button"
                        class="fi-workspace-tabs-closed-item"
                    >
                        <span x-text="closed.label" class="truncate"></span>
                    </button>
                </template>
            </div>
        </div>
    </div>

    {{-- Context menu --}}
    <div
        x-ref="contextMenu"
        x-show="contextMenu.open"
        x-transition
        :style="`left: ${contextMenu.x}px; top: ${contextMenu.y}px;`"
        class="fi-workspace-tabs-context-menu"
    >
        <button x-on:click="closeTab(contextMenu.tabId); closeContextMenu()" type="button" x-show="getContextTab() && !getContextTab()?.pinned">
            {{ __('filament-workspace-tabs::tabs.context_menu.close') }}
        </button>
        <button x-on:click="closeOthers(contextMenu.tabId); closeContextMenu()" type="button">
            {{ __('filament-workspace-tabs::tabs.context_menu.close_others') }}
        </button>
        <button x-on:click="closeToRight(contextMenu.tabId); closeContextMenu()" type="button">
            {{ __('filament-workspace-tabs::tabs.context_menu.close_to_the_right') }}
        </button>
        <div class="fi-workspace-tabs-context-divider"></div>
        <button x-on:click="duplicateTab(contextMenu.tabId); closeContextMenu()" type="button">
            {{ __('filament-workspace-tabs::tabs.context_menu.duplicate') }}
        </button>
        <button x-on:click="pinTab(contextMenu.tabId); closeContextMenu()" type="button">
            <span x-text="getContextTab()?.pinned ? '{{ __('filament-workspace-tabs::tabs.context_menu.unpin') }}' : '{{ __('filament-workspace-tabs::tabs.context_menu.pin') }}'"></span>
        </button>
        <div class="fi-workspace-tabs-context-divider"></div>
        <button x-on:click="closeAll(); closeContextMenu()" type="button">
            {{ __('filament-workspace-tabs::tabs.context_menu.close_all') }}
        </button>
    </div>
</div>
