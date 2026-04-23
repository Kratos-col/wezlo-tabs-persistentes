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

const encrypt = (data, key) => {
    if (!data) return data
    try {
        const json = JSON.stringify(data)
        if (!key) return json
        
        let result = ''
        for (let i = 0; i < json.length; i++) {
            result += String.fromCharCode(
                json.charCodeAt(i) ^ key.charCodeAt(i % key.length),
            )
        }
        return btoa(unescape(encodeURIComponent(result)))
    } catch (e) {
        console.error('[WorkspaceTabs] Encryption failed:', e)
        return typeof data === 'string' ? data : JSON.stringify(data)
    }
}

const decrypt = (encoded, key) => {
    if (!encoded || typeof encoded !== 'string') return encoded
    
    // If it's a JSON string (likely unencrypted data), parse it directly
    if (encoded.startsWith('[') || encoded.startsWith('{')) {
        try {
            return JSON.parse(encoded)
        } catch (e) {
            return null
        }
    }

    if (!key) return null

    try {
        const json = decodeURIComponent(escape(atob(encoded)))
        let result = ''
        for (let i = 0; i < json.length; i++) {
            result += String.fromCharCode(
                json.charCodeAt(i) ^ key.charCodeAt(i % key.length),
            )
        }
        return JSON.parse(result)
    } catch (e) {
        // If decryption fails, it might be unencrypted data or a key mismatch
        // If it was already a valid JSON string, we would have caught it above.
        // Return null to signal failure so the driver can use the default value.
        return null
    }
}

function workspaceTabs({
    maxTabs,
    persistKey,
    excludeUrls,
    enableContextMenu,
    enableDragReorder,
    autoCloseCreateTabs,
    enableSnapshots,
    enableScrollRestoration,
    encryptionKey,
    translations = {},
}) {
    // Helper functions in closure scope (more robust than 'this' methods)
    const fetchIcon = () => {
        const link = document.querySelector('link[rel*="icon"]')
        return link ? link.href : null
    }

    const extractTitle = () => {
        const full = document.title
        const separator = ' - '
        const idx = full.lastIndexOf(separator)
        return idx > 0 ? full.substring(0, idx).trim() : full.trim()
    }

    const currentUrl = () => window.location.pathname + window.location.search

    const isExcluded = (url) => excludeUrls.some((pattern) => url.startsWith(pattern))

    const normalizeUrl = (url) => {
        if (!url) return ''
        try {
            const u = new URL(url, window.location.origin)
            // Remove trailing slash and normalize
            let path = u.pathname.replace(/\/$/, '') || '/'
            return path + u.search
        } catch {
            return url.replace(/\/$/, '') || '/'
        }
    }

    const urlsMatch = (url1, url2) => {
        if (!url1 || !url2) return false
        return normalizeUrl(url1) === normalizeUrl(url2)
    }

    const getPath = (url) => {
        try {
            return new URL(url, window.location.origin).pathname
        } catch {
            return url.split('?')[0]
        }
    }

    const encryptedStorage = {
        getItem: (key) => {
            const val = localStorage.getItem(key)
            if (!val) return null
            try {
                // Decrypt the raw stored string
                const decrypted = decrypt(val, encryptionKey)
                
                // If decryption failed, return null so Alpine uses the default value ([])
                if (decrypted === null) return null
                
                // Return as JSON string because Alpine's $persist internal 
                // logic always calls JSON.parse() on the result of getItem()
                return JSON.stringify(decrypted)
            } catch (e) {
                return null
            }
        },
        setItem: (key, val) => {
            try {
                // Alpine already JSON.stringifies the value before calling setItem.
                // We parse it back to encrypt the actual data structure.
                const data = JSON.parse(val)
                localStorage.setItem(key, encrypt(data, encryptionKey))
            } catch (e) {
                localStorage.setItem(key, val)
            }
        },
        removeItem: (key) => localStorage.removeItem(key),
    }

    return {
        tabs: Alpine.$persist([]).as(`${persistKey}_tabs`).using(encryptedStorage),
        activeTabId: Alpine.$persist(null)
            .as(`${persistKey}_active`)
            .using(encryptedStorage),
        closedTabs: Alpine.$persist([])
            .as(`${persistKey}_closed`)
            .using(encryptedStorage),

        contextMenu: { open: false, x: 0, y: 0, tabId: null },
        sortableInstance: null,
        isPopstate: false,
        showClosedMenu: false,

        get pinnedTabs() {
            if (!Array.isArray(this.tabs)) return []
            return this.tabs
                .filter((t) => t && t.pinned)
                .sort((a, b) => a.order - b.order)
        },

        get unpinnedTabs() {
            if (!Array.isArray(this.tabs)) return []
            return this.tabs
                .filter((t) => t && !t.pinned)
                .sort((a, b) => a.order - b.order)
        },

        get sortedTabs() {
            return [...this.pinnedTabs, ...this.unpinnedTabs]
        },

        get activeTab() {
            if (!Array.isArray(this.tabs)) return null
            return this.tabs.find((t) => t && t.id === this.activeTabId)
        },

        init() {
            // Safeguard: Ensure state is always an array
            if (!Array.isArray(this.tabs)) this.tabs = []
            if (!Array.isArray(this.closedTabs)) this.closedTabs = []

            // Sync immediately on boot to handle initial state or full reloads

            // Global listeners should be attached to the document/window
            // each instance needs to react to these to stay in sync
            const handleNavigated = () => {
                this.$nextTick(() => this.syncCurrentPage())
            }

            const handlePopstate = () => {
                this.isPopstate = true
                this.$nextTick(() => this.syncCurrentPage())
            }

            document.addEventListener('livewire:navigated', handleNavigated)
            window.addEventListener('popstate', handlePopstate)
            
            // Capture state whenever Livewire updates any component
            document.addEventListener('livewire:update', () => {
                if (this.activeTabId) {
                    this.captureState(this.activeTabId)
                }
            })

            // Capture state right before navigating away
            document.addEventListener('livewire:navigating', () => {
                if (this.activeTabId) {
                    this.captureState(this.activeTabId)
                }
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

        syncCurrentPage() {
            const url = currentUrl()
            
            if (isExcluded(url)) {
                // If we are on the login page, clear all persistent state for security
                if (url.includes('/login') || url.includes('/logout')) {
                    this.clearAllData()
                }
                return
            }

            // Capture state of the tab we are leaving
            if (this.activeTabId) {
                this.captureState(this.activeTabId)
            }

            const label = extractTitle()
            const icon = fetchIcon()

            // Handle auto-closing of 'create' tabs after successful submission/navigation
            if (autoCloseCreateTabs && this.activeTab && !urlsMatch(this.activeTab.url, url)) {
                if (this.activeTab.url.endsWith('/create')) {
                    this.removeTab(this.activeTabId, false)
                }
            }
            
            // Find existing tab: Try strict match first, then path-based match for nested resources/tabs
            if (!Array.isArray(this.tabs)) {
                this.tabs = []
            }

            let existingIdx = this.tabs.findIndex((t) => t && urlsMatch(t.url, url))
            if (existingIdx === -1) {
                const path = getPath(url)
                existingIdx = this.tabs.findIndex((t) => t && getPath(t.url) === path)
            }

            if (existingIdx !== -1) {
                const existing = this.tabs[existingIdx]
                existing.label = label
                existing.icon = icon
                existing.url = url
                this.activeTabId = existing.id
            } else {
                this.addTab(url, label, false, icon)
            }

            this.isPopstate = false
            
            // Restore state (scroll, snapshots) for the new active tab
            // We do this immediately to minimize flickering, before Alpine/Livewire fully settle
            this.restoreState(this.activeTabId)
            this.$nextTick(() => {
                this.updateScrollState()
            })
        },

        addTab(url, label, pinned = false, icon = null) {
            if (!Array.isArray(this.tabs)) {
                this.tabs = []
            }

            // Check if already reached max tabs limit
            if (this.tabs.length >= maxTabs) {
                const oldestUnpinned = this.unpinnedTabs.find(
                    (t) => t && t.id !== this.activeTabId,
                )
                if (oldestUnpinned) {
                    this.removeTab(oldestUnpinned.id, false)
                }
            }

            const tabId = generateId()
            const tabLabel = label || translations.new_tab || 'New Tab'
            
            const tab = {
                id: tabId,
                url,
                label: tabLabel,
                icon: icon || fetchIcon(),
                pinned,
                order: this.tabs.length,
                createdAt: Date.now(),
            }

            this.tabs.push(tab)
            this.activeTabId = tabId

            // console.log('[WorkspaceTabs] Tab added:', tabLabel, tabId)
            
            this.$nextTick(() => {
                this.reindex()
                this.updateScrollState()
            })

            return tab
        },

        switchTab(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab) return

            if (this.activeTabId) {
                this.captureState(this.activeTabId)
            }

            if (urlsMatch(tab.url, currentUrl())) {
                this.activeTabId = tabId
                this.restoreState(tabId)
                return
            }

            this.activeTabId = tabId
            Livewire.navigate(tab.url)
        },

        closeTab(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab || tab.pinned) return

            this.pushClosed(tab)
            this.removeTab(tabId, true)
        },

        removeTab(tabId, activate) {
            if (!Array.isArray(this.tabs)) return
            const idx = this.tabs.findIndex((t) => t && t.id === tabId)
            if (idx === -1) return

            const wasActive = this.activeTabId === tabId
            const tabUrl = this.tabs[idx].url

            this.tabs.splice(idx, 1)
            this.reindex()

            // Sync with server session to free up persistence slot
            fetch('/wezlo-tabs-persistentes/close', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector('meta[name="csrf-token"]')?.content ||
                        '',
                },
                body: JSON.stringify({ url: window.location.origin + tabUrl }),
            })

            if (activate && wasActive && this.tabs.length > 0) {
                const sorted = this.sortedTabs
                const newIdx = Math.min(idx, sorted.length - 1)
                const newTab = sorted[newIdx]
                this.switchTab(newTab.id)
            }
        },

        pinTab(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab) return
            tab.pinned = !tab.pinned
            this.reindex()
        },

        duplicateTab(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab) return
            const newTab = this.addTab(tab.url, tab.label)
            this.switchTab(newTab.id)
        },

        closeOthers(tabId) {
            if (!Array.isArray(this.tabs)) return
            const toClose = this.tabs.filter(
                (t) => t && t.id !== tabId && !t.pinned,
            )
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => t && (t.id === tabId || t.pinned))
            this.reindex()

            if (!this.tabs.find((t) => t && t.id === this.activeTabId)) {
                this.switchTab(tabId)
            }
        },

        closeToRight(tabId) {
            if (!Array.isArray(this.tabs)) return

            const sorted = this.sortedTabs
            const idx = sorted.findIndex((t) => t && t.id === tabId)
            const toClose = sorted
                .slice(idx + 1)
                .filter((t) => t && !t.pinned)
            const toCloseIds = new Set(toClose.map((t) => t.id))
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => t && !toCloseIds.has(t.id))
            this.reindex()

            if (!this.tabs.find((t) => t && t.id === this.activeTabId)) {
                this.switchTab(tabId)
            }
        },

        closeAll() {
            if (!Array.isArray(this.tabs)) return

            const toClose = this.tabs.filter((t) => t && !t.pinned)
            toClose.forEach((t) => this.pushClosed(t))
            this.tabs = this.tabs.filter((t) => t && t.pinned)
            this.reindex()

            if (this.tabs.length > 0 && !this.activeTab) {
                this.switchTab(this.tabs[0].id)
            }
        },

        reindex() {
            if (!Array.isArray(this.tabs)) return
            this.pinnedTabs.forEach((t, i) => { if (t) t.order = i })
            this.unpinnedTabs.forEach(
                (t, i) => { if (t) t.order = this.pinnedTabs.length + i },
            )
        },

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
            if (!Array.isArray(this.tabs)) return null
            return this.tabs.find((t) => t && t.id === this.contextMenu.tabId)
        },

        initSortable() {
            const strip = this.$refs.tabStrip
            if (!strip || !Array.isArray(this.tabs)) return

            this.sortableInstance = Sortable.create(strip, {
                animation: 150,
                ghostClass: 'fi-workspace-tab-ghost',
                dragClass: 'fi-workspace-tab-drag',
                handle: '.fi-workspace-tab',
                draggable: '.fi-workspace-tab',
                onEnd: (evt) => {
                    const tabId = evt.item.dataset.tabId
                    if (!tabId || !Array.isArray(this.tabs)) return

                    const items = strip.querySelectorAll('.fi-workspace-tab')
                    const newOrder = []
                    items.forEach((el, i) => {
                        const id = el.dataset.tabId
                        const tab = this.tabs.find((t) => t && t.id === id)
                        if (tab) {
                            tab.order = i
                            newOrder.push(tab)
                        }
                    })
                },
            })
        },

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

        interceptNavigation() {
            document.addEventListener('auxclick', (e) => {
                if (e.button !== 1) return
                const link = e.target.closest('a[href]')
                if (!link) return

                try {
                    const url = new URL(link.href)
                    if (url.origin !== window.location.origin) return
                    const path = url.pathname + url.search
                    if (isExcluded(path)) return

                    e.preventDefault()
                    
                    const existing = this.tabs.find((t) => urlsMatch(t.url, path))
                    if (existing) {
                        this.switchTab(existing.id)
                    } else {
                        this.addTab(path, translations.loading || 'Loading...')
                    }
                } catch {}
            })

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
                            if (isExcluded(path)) return

                            e.preventDefault()
                            e.stopPropagation()

                            const existing = this.tabs.find((t) => urlsMatch(t.url, path))
                            if (existing) {
                                this.switchTab(existing.id)
                            } else {
                                this.addTab(path, translations.loading || 'Loading...')
                            }
                        } catch {}
                    }
                },
                true,
            )
        },

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

        captureState(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab) return

            if (enableScrollRestoration) {
                tab.scrollX = window.scrollX
                tab.scrollY = window.scrollY
            }

            if (enableSnapshots) {
                const content =
                    document.querySelector('.fi-main-ctn') ||
                    document.querySelector('main')
                if (content) {
                    try {
                        sessionStorage.setItem(
                            `${persistKey}_snapshot_${tabId}`,
                            encrypt(content.innerHTML, encryptionKey),
                        )
                    } catch (e) {}
                }
            }
        },

        restoreState(tabId) {
            if (!Array.isArray(this.tabs)) return
            const tab = this.tabs.find((t) => t && t.id === tabId)
            if (!tab) return

            if (enableSnapshots) {
                const encoded = sessionStorage.getItem(
                    `${persistKey}_snapshot_${tabId}`,
                )
                const snapshot = decrypt(encoded, encryptionKey)
                const content =
                    document.querySelector('.fi-main-ctn') ||
                    document.querySelector('main')

                if (snapshot && content) {
                    if (content.innerHTML !== snapshot) {
                        content.innerHTML = snapshot
                    }
                }
            }

            if (enableScrollRestoration) {
                window.scrollTo({
                    left: tab.scrollX || 0,
                    top: tab.scrollY || 0,
                    behavior: 'instant',
                })
            }
        },

        clearAllData() {
            // Clear snapshots from sessionStorage
            Object.keys(sessionStorage).forEach((key) => {
                if (key.startsWith(`${persistKey}_snapshot_`)) {
                    sessionStorage.removeItem(key)
                }
            })

            // Reset Alpine state (which will sync to localStorage via $persist)
            this.tabs = []
            this.activeTabId = null
            this.closedTabs = []
            
            // console.log('[WorkspaceTabs] Persistent state cleared')
        },
    }
}

if (typeof window !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        window.Alpine.data('workspaceTabs', workspaceTabs)
    })
}
