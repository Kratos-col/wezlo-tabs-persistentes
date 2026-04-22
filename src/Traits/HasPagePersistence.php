<?php

namespace Wezlo\TabsPersistentes\Traits;

use Illuminate\Support\Facades\Session;

trait HasPagePersistence
{
    /**
     * Define which properties should be persistent.
     * Override this in your component if you only want specific properties to persist.
     * 
     * @return array
     */
    protected function getPersistentProperties(): array
    {
        return property_exists($this, 'persistentProperties') 
            ? $this->persistentProperties 
            : [];
    }

    /**
     * Lifecycle hook: Before the component is mounted.
     */
    public function mountHasPagePersistence(): void
    {
        $this->restorePersistentState();
    }

    /**
     * Lifecycle hook: After any property is updated.
     */
    public function updatedHasPagePersistence($name, $value): void
    {
        $this->savePersistentState();
    }

    /**
     * Save current state to session.
     */
    public function savePersistentState(): void
    {
        $properties = $this->getPersistentProperties();
        if (empty($properties)) {
            return;
        }

        $state = [];
        foreach ($properties as $property) {
            if (property_exists($this, $property)) {
                $state[$property] = $this->{$property};
            }
        }

        Session::put($this->getPersistenceKey(), $state);
    }

    /**
     * Restore state from session.
     */
    public function restorePersistentState(): void
    {
        $state = Session::get($this->getPersistenceKey());

        if (!$state) {
            return;
        }

        foreach ($state as $property => $value) {
            if (property_exists($this, $property)) {
                $this->{$property} = $value;
            }
        }
    }

    /**
     * Generate a unique key for this page/component instance.
     */
    protected function getPersistenceKey(): string
    {
        $componentName = str_replace('\\', '_', static::class);
        $url = request()->getPathInfo();
        
        return "workspace_tabs_state_{$componentName}_" . md5($url);
    }
}
