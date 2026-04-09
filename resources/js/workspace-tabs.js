import Sortable from 'sortablejs'

function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export default function workspaceTabs({
    maxTabs,
    persistKey,
    excludeUrls,
    enableContextMenu,
    enableDragReorder,
    translations = {},
}) {
    return {
        tabs: Alpine.$persist([]).as(`${persistKey}_tabs`),
        activeTabId: Alpine.$persist(null).as(`${persistKey}_active`),
        closedTabs: Alpine.$persist([]).as(`${persistKey}_closed`),

        contextMenu: { open: false, x: 0, y: 0, tabId: null },
        sortableInstance: null,
        isPopstate: false,
        showClosedMenu: false,

        get pinnedTabs() {
            return this.tabs
                .filter((t) => t.pinned)
                .sort((a, b) => a.order - b.order)
        },

        get unpinnedTabs() {
            return this.tabs
                .filter((t) => !t.pinned)
                .sort((a, b) => a.order - b.order)
        },

        get sortedTabs() {
            return [...this.pinnedTabs, ...this.unpinnedTabs]
        },

        get activeTab() {
            return this.tabs.find((t) => t.id === this.activeTabId)
        },

        init() {
            this.syncCurrentPage()

            document.addEventListener('livewire:navigated', () => {
                this.$nextTick(() => this.syncCurrentPage())
            })

            window.addEventListener('popstate', () => {
                this.isPopstate = true
            })

            this.interceptNavigation()

            if (enableDragReorder) {
                this.$nextTick(() => this.initSortable())
            }

            document.addEventListener('click', (e) => {
                if (
                    this.contextMenu.open &&
                    !this.$refs.contextMenu?.contains(e.target)
                ) {
                    this.closeContextMenu()
                }
            })

            document.addEventListener('keydown', (e) => {
                if (this.contextMenu.open && e.key === 'Escape') {
                    this.closeContextMenu()
                }

                if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                    if (this.activeTab && !this.activeTab.pinned) {
                        e.preventDefault()
                        this.closeTab(this.activeTabId)
                    }
                }
            })
        },

        currentUrl() {
            return window.location.pathname + window.location.search
        },

        isExcluded(url) {
            return excludeUrls.some((pattern) => url.startsWith(pattern))
        },

        extractTitle() {
            const full = document.title
            const separator = ' - '
            const idx = full.lastIndexOf(separator)
            return idx > 0 ? full.substring(0, idx).trim() : full.trim()
        },

        syncCurrentPage() {
            const url = this.currentUrl()
            if (this.isExcluded(url)) return

            const label = this.extractTitle()
            const existing = this.tabs.find((t) => this.urlsMatch(t.url, url))

            if (existing) {
                // Already have a tab for this URL — just activate it
                existing.label = label
                existing.url = url
                this.activeTabId = existing.id
            } else {
                // New URL — always open a new tab
                this.addTab(url, label)
            }

            this.isPopstate = false
        },

        urlsMatch(url1, url2) {
            // Match on pathname only, ignoring table state query params
            try {
                const path1 = url1.split('?')[0]
                const path2 = url2.split('?')[0]
                return path1 === path2
            } catch {
                return url1 === url2
            }
        },

        addTab(url, label, pinned = false) {
            if (this.tabs.length >= maxTabs) {
                const oldest = this.unpinnedTabs.find(
                    (t) => t.id !== this.activeTabId,
                )
                if (oldest) {
                    this.removeTab(oldest.id, false)
                }
            }

            const tab = {
                id: generateId(),
                url,
                label: label || translations.new_tab || 'New Tab',
                pinned,
                order: this.tabs.length,
                createdAt: Date.now(),
            }

            this.tabs.push(tab)
            this.activeTabId = tab.id

            return tab
        },

        switchTab(tabId) {
            const tab = this.tabs.find((t) => t.id === tabId)
            if (!tab) return

            if (this.urlsMatch(tab.url, this.currentUrl())) {
                this.activeTabId = tabId
                return
            }

            this.activeTabId = tabId
            Livewire.navigate(tab.url)
        },

        closeTab(tabId) {
            const tab = this.tabs.find((t) => t.id === tabId)
            if (!tab || tab.pinned) return

            this.pushClosed(tab)
            this.removeTab(tabId, true)
        },

        removeTab(tabId, activate) {
            const idx = this.tabs.findIndex((t) => t.id === tabId)
            if (idx === -1) return

            const wasActive = this.activeTabId === tabId

            this.tabs.splice(idx, 1)
            this.reindex()

            if (activate && wasActive && this.tabs.length > 0) {
                const sorted = this.sortedTabs
                const newIdx = Math.min(idx, sorted.length - 1)
                const newTab = sorted[newIdx]
                this.switchTab(newTab.id)
            }
        },

        pinTab(tabId) {
            const tab = this.tabs.find((t) => t.id === tabId)
            if (!tab) return
            tab.pinned = !tab.pinned
            this.reindex()
        },

        duplicateTab(tabId) {
            const tab = this.tabs.find((t) => t.id === tabId)
            if (!tab) return
            const newTab = this.addTab(tab.url, tab.label)
            this.switchTab(newTab.id)
        },

        closeOthers(tabId) {
            const toClose = this.tabs.filter(
                (t) => t.id !== tabId && !t.pinned,
            )
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => t.id === tabId || t.pinned)
            this.reindex()

            if (!this.tabs.find((t) => t.id === this.activeTabId)) {
                this.switchTab(tabId)
            }
        },

        closeToRight(tabId) {
            const sorted = this.sortedTabs
            const idx = sorted.findIndex((t) => t.id === tabId)
            const toClose = sorted
                .slice(idx + 1)
                .filter((t) => !t.pinned)
            const toCloseIds = new Set(toClose.map((t) => t.id))
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => !toCloseIds.has(t.id))
            this.reindex()

            if (!this.tabs.find((t) => t.id === this.activeTabId)) {
                this.switchTab(tabId)
            }
        },

        closeAll() {
            const toClose = this.tabs.filter((t) => !t.pinned)
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => t.pinned)
            this.reindex()

            if (this.tabs.length > 0 && !this.activeTab) {
                this.switchTab(this.tabs[0].id)
            }
        },

        reindex() {
            this.pinnedTabs.forEach((t, i) => (t.order = i))
            this.unpinnedTabs.forEach(
                (t, i) => (t.order = this.pinnedTabs.length + i),
            )
        },

        // Context menu
        openContextMenu(event, tabId) {
            if (!enableContextMenu) return
            event.preventDefault()

            const rect = this.$refs.tabStrip.getBoundingClientRect()
            this.contextMenu = {
                open: true,
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                tabId,
            }
        },

        closeContextMenu() {
            this.contextMenu.open = false
        },

        getContextTab() {
            return this.tabs.find((t) => t.id === this.contextMenu.tabId)
        },

        // Drag reorder
        initSortable() {
            const strip = this.$refs.tabStrip
            if (!strip) return

            this.sortableInstance = Sortable.create(strip, {
                animation: 150,
                ghostClass: 'fi-workspace-tab-ghost',
                dragClass: 'fi-workspace-tab-drag',
                handle: '.fi-workspace-tab',
                draggable: '.fi-workspace-tab',
                onEnd: (evt) => {
                    const tabId = evt.item.dataset.tabId
                    if (!tabId) return

                    // Rebuild order from DOM
                    const items = strip.querySelectorAll('.fi-workspace-tab')
                    const newOrder = []
                    items.forEach((el, i) => {
                        const id = el.dataset.tabId
                        const tab = this.tabs.find((t) => t.id === id)
                        if (tab) {
                            tab.order = i
                            newOrder.push(tab)
                        }
                    })
                },
            })
        },

        // Closed tabs history
        pushClosed(tab) {
            this.closedTabs.unshift({
                url: tab.url,
                label: tab.label,
                closedAt: Date.now(),
            })
            if (this.closedTabs.length > 50) {
                this.closedTabs = this.closedTabs.slice(0, 50)
            }
        },

        reopenTab(index) {
            const closed = this.closedTabs[index]
            if (!closed) return
            this.closedTabs.splice(index, 1)
            const tab = this.addTab(closed.url, closed.label)
            this.switchTab(tab.id)
            this.showClosedMenu = false
        },

        // Navigation interception
        interceptNavigation() {
            // Middle-click opens in new tab
            document.addEventListener('auxclick', (e) => {
                if (e.button !== 1) return
                const link = e.target.closest('a[href]')
                if (!link) return

                try {
                    const url = new URL(link.href)
                    if (url.origin !== window.location.origin) return
                    const path = url.pathname + url.search
                    if (this.isExcluded(path)) return

                    e.preventDefault()
                    const tab = this.addTab(path, translations.loading || 'Loading...')
                    // Don't navigate — just add the tab. User can click it to load.
                } catch {
                    // Invalid URL, ignore
                }
            })

            // Ctrl+click opens in new tab
            document.addEventListener(
                'click',
                (e) => {
                    if (!(e.ctrlKey || e.metaKey)) return
                    const link = e.target.closest('a[href]')
                    if (!link) return
                    if (link.hasAttribute('wire:navigate')) {
                        try {
                            const url = new URL(link.href)
                            if (url.origin !== window.location.origin) return
                            const path = url.pathname + url.search
                            if (this.isExcluded(path)) return

                            e.preventDefault()
                            e.stopPropagation()
                            this.addTab(path, translations.loading || 'Loading...')
                        } catch {
                            // Invalid URL, ignore
                        }
                    }
                },
                true,
            )
        },

        // Scroll helpers
        canScrollLeft: false,
        canScrollRight: false,

        updateScrollState() {
            const strip = this.$refs.tabStrip
            if (!strip) return
            this.canScrollLeft = strip.scrollLeft > 0
            this.canScrollRight =
                strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1
        },

        scrollLeft() {
            this.$refs.tabStrip?.scrollBy({ left: -200, behavior: 'smooth' })
        },

        scrollRight() {
            this.$refs.tabStrip?.scrollBy({ left: 200, behavior: 'smooth' })
        },
    }
}
