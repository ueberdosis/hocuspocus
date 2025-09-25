# @hocuspocus/provider
[![Version](https://img.shields.io/npm/v/@hocuspocus/provider.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/provider)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/provider.svg)](https://npmcharts.com/compare/@hocuspocus/provider?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/provider.svg)](https://www.npmjs.com/package/@hocuspocus/provider)

WebSocket provider for Hocuspocus with built-in permission control support. Provides both standard collaborative editing functionality and advanced permission-aware features for enterprise applications.

## Installation

```bash
npm install @hocuspocus/provider
```

## Quick Start

### Basic Usage (Standard Provider)

```javascript
import { HocuspocusProvider } from '@hocuspocus/provider'

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
})
```

### Permission-Aware Usage

```javascript
import { PermissionAwareProvider, ClientPermissionLevel } from '@hocuspocus/provider'

const provider = new PermissionAwareProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'example-document',
  token: 'your-auth-token',
  
  // Permission event handlers
  onPermissionChange: (event) => {
    console.log('Permission changed:', event.level)
    if (event.level === ClientPermissionLevel.READ) {
      disableEditor()
    }
  },
  
  onPermissionDenied: (event) => {
    console.warn('Operation denied:', event.reason)
    showPermissionError(event.reason)
  },
  
  enableClientSidePermissionCheck: true,
  disableEditingWhenReadOnly: true
})
```

### Factory Functions (Recommended)

```javascript
import { createProvider, createSmartProvider } from '@hocuspocus/provider'

// Backward compatible - works exactly like HocuspocusProvider
const standardProvider = createProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document-name'
})

// Permission-aware when needed
const permissionProvider = createProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document-name',
  enablePermissions: true,
  token: 'auth-token'
})

// Smart detection based on configuration
const smartProvider = createSmartProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document-name',
  token: 'auth-token', // Auto-detects need for permissions
  autoDetectPermissions: true
})
```

## Permission System

### Permission Levels

- **WRITE**: Full read/write access
- **READ**: Read-only access (can view and move cursor)
- **DENY**: No access (connection will be rejected)

### Y.js Operation-Level Control

```javascript
import { PermissionAwareDocument, YjsOperationType } from '@hocuspocus/provider'

const doc = new PermissionAwareDocument({
  documentName: 'controlled-document',
  permissionConfig: {
    level: ClientPermissionLevel.WRITE,
    deniedOperations: [YjsOperationType.DELETE],
    allowedPaths: ['content', 'comments'],
    deniedPaths: ['admin.*', 'system.*']
  }
})

doc.on('permission-denied', (event) => {
  console.warn('Operation blocked:', event.operationType, event.reason)
})
```

### Permission Presets

```javascript
import { createProviderWithPreset, PermissionPresets } from '@hocuspocus/provider'

// Read-only access
const readOnlyProvider = createProviderWithPreset({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  preset: 'ReadOnly'
})

// Comment-only access (can add comments but not edit content)
const commentProvider = createProviderWithPreset({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  preset: 'CommentOnly'
})

// Content editor (can edit content but not metadata)
const editorProvider = createProviderWithPreset({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  preset: 'ContentEditor'
})
```

## Advanced Features

### Client-Side Permission Validation

```javascript
const provider = new PermissionAwareProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  enableClientSidePermissionCheck: true,
  
  onOperationCheck: (event) => {
    if (!event.allowed) {
      console.log(`Operation ${event.operationType} blocked for path:`, event.path)
      showToast(`Cannot perform ${event.operationType} - insufficient permissions`)
    }
  }
})

// Check permissions before operations
if (provider.hasPermission(ClientPermissionLevel.WRITE)) {
  document.getText('content').insert(0, 'New content')
} else {
  showError('You do not have write permissions')
}
```

### Permission Caching and Performance

```javascript
const provider = new PermissionAwareProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  permissionCacheTime: 30000, // 30 second cache
  
  onPermissionChange: (event) => {
    // Cache permission state in localStorage
    localStorage.setItem('userPermission', JSON.stringify(event))
  }
})

// Manual permission check with caching
const permission = await provider.checkPermission()
console.log('Current permission:', permission.level)

// Get performance statistics
const stats = provider.getPermissionStats()
console.log('Permission checks:', stats.permissionChecks)
console.log('Cache hits:', stats.cacheHits)
```

## Migration from Standard Provider

### Gradual Migration

```javascript
import { upgradeToPermissionAware, isPermissionAwareProvider } from '@hocuspocus/provider'

// Existing standard provider
let provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document'
})

// Upgrade when permission features are needed
if (userNeedsPermissionControl()) {
  provider = upgradeToPermissionAware(provider, {
    onPermissionChange: handlePermissionChange,
    onPermissionDenied: handlePermissionDenied
  })
}

// Type-safe checking
if (isPermissionAwareProvider(provider)) {
  const stats = provider.getPermissionStats()
  console.log('Permission statistics:', stats)
}
```

### Backward Compatibility

All existing code using `HocuspocusProvider` continues to work without any changes:

```javascript
// This still works exactly as before
import { HocuspocusProvider } from '@hocuspocus/provider'

const provider = new HocuspocusProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  // All existing options supported
})
```

## Real-World Examples

### Rich Text Editor Integration

```javascript
import { createProvider, ClientPermissionLevel } from '@hocuspocus/provider'

class CollaborativeEditor {
  constructor(element, documentName) {
    this.element = element
    this.provider = createProvider({
      url: 'ws://localhost:1234',
      name: documentName,
      enablePermissions: true,
      token: getAuthToken(),
      
      onPermissionChange: this.handlePermissionChange.bind(this),
      onPermissionDenied: this.handlePermissionDenied.bind(this)
    })
  }
  
  handlePermissionChange({ level, previousLevel, reason }) {
    const isReadOnly = level !== ClientPermissionLevel.WRITE
    this.element.contentEditable = !isReadOnly
    
    // Update UI indicators
    this.updateToolbar(level)
    this.showPermissionBadge(level)
    
    if (level === ClientPermissionLevel.DENY) {
      this.showMessage('Access revoked - document closed', 'error')
      this.provider.destroy()
    }
  }
  
  handlePermissionDenied({ operation, reason }) {
    this.showMessage(`Operation "${operation}" denied: ${reason}`, 'warning')
  }
  
  updateToolbar(level) {
    const toolbar = this.element.parentNode.querySelector('.toolbar')
    const editButtons = toolbar.querySelectorAll('.edit-action')
    
    editButtons.forEach(button => {
      button.disabled = level !== ClientPermissionLevel.WRITE
    })
  }
}
```

### Permission-Aware Form System

```javascript
import { PermissionAwareDocument, PermissionPresets } from '@hocuspocus/provider'

class PermissionAwareForm {
  constructor(formElement) {
    this.form = formElement
    this.doc = new PermissionAwareDocument({
      documentName: 'form-data',
      permissionConfig: PermissionPresets.ContentEditor()
    })
    
    this.setupFormBinding()
  }
  
  setupFormBinding() {
    const formMap = this.doc.getMap('form')
    
    // Bind form inputs to Y.js document
    this.form.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('change', (e) => {
        if (this.doc.hasPermission(ClientPermissionLevel.WRITE)) {
          formMap.set(input.name, input.value)
        } else {
          e.preventDefault()
          this.showError('No permission to edit this field')
        }
      })
    })
    
    // Listen for remote changes
    formMap.observe((event) => {
      event.changes.keys.forEach((change, key) => {
        const input = this.form.querySelector(`[name="${key}"]`)
        if (input && change.action === 'add') {
          input.value = formMap.get(key)
        }
      })
    })
  }
}
```

### Real-Time Permission Status

```javascript
import { PermissionAwareProvider } from '@hocuspocus/provider'

class PermissionStatusIndicator {
  constructor(container, provider) {
    this.container = container
    this.provider = provider
    this.createIndicator()
    this.bindEvents()
  }
  
  createIndicator() {
    this.indicator = document.createElement('div')
    this.indicator.className = 'permission-status'
    this.indicator.innerHTML = `
      <div class="status-badge"></div>
      <div class="status-text"></div>
      <div class="status-actions"></div>
    `
    this.container.appendChild(this.indicator)
  }
  
  bindEvents() {
    this.provider.on('permission-change', (event) => {
      this.updateStatus(event.level, event.reason)
    })
    
    // Refresh status periodically
    setInterval(() => {
      this.provider.checkPermission().then(({ level }) => {
        this.updateStatus(level)
      }).catch(console.warn)
    }, 30000)
  }
  
  updateStatus(level, reason = '') {
    const badge = this.indicator.querySelector('.status-badge')
    const text = this.indicator.querySelector('.status-text')
    const actions = this.indicator.querySelector('.status-actions')
    
    // Update badge color
    badge.className = `status-badge level-${level.toLowerCase()}`
    
    // Update text
    const levelText = {
      WRITE: 'Editor',
      READ: 'Viewer', 
      DENY: 'No Access'
    }
    text.textContent = levelText[level] || 'Unknown'
    
    // Show action buttons if needed
    if (level === 'READ') {
      actions.innerHTML = '<button onclick="requestEditAccess()">Request Edit Access</button>'
    } else {
      actions.innerHTML = ''
    }
  }
}
```

## Integration with Server

### Requires @hocuspocus/extension-permission on server

```javascript
// Server setup
import { Server } from '@hocuspocus/server'
import { Permission } from '@hocuspocus/extension-permission'

const server = new Server({
  extensions: [
    new Permission({
      getUser: getUserFromToken,
      getPermission: getPermissionFromDatabase
    })
  ]
})

// Client automatically syncs with server permissions
const provider = new PermissionAwareProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  token: 'user-token' // Server validates and returns permissions
})
```

### Real-time Permission Updates

```javascript
const provider = new PermissionAwareProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  token: getToken,
  
  onPermissionChange: (event) => {
    updateUI(event.level)
    
    if (event.level === ClientPermissionLevel.DENY) {
      showDialog('Access revoked - document will be closed')
      provider.destroy()
    }
  }
})

// Server can push permission updates in real-time
// Client automatically receives and applies new permissions
```

## API Reference

### PermissionAwareProvider

Extends `HocuspocusProvider` with permission control features.

#### Methods

- `getPermissionState(): ClientPermissionState` - Get current permission state
- `hasPermission(level: ClientPermissionLevel): boolean` - Check if has specific permission
- `checkPermission(): Promise<ClientPermissionState>` - Manual permission check with server
- `getPermissionStats()` - Get permission check statistics
- `resetPermissionStats()` - Reset statistics

#### Events

- `onPermissionChange(event: PermissionChangeEvent)` - Permission level changed
- `onPermissionDenied(event: PermissionDeniedEvent)` - Operation was denied
- `onOperationCheck(event: OperationCheckEvent)` - Operation permission check

### PermissionAwareDocument

Extends `Y.Doc` with operation-level permission control.

#### Methods

- `getPermissionLevel(): ClientPermissionLevel` - Get current permission level
- `hasPermission(level: ClientPermissionLevel): boolean` - Check permission level
- `isReadOnly(): boolean` - Check if document is read-only
- `updatePermission(config: DocumentPermissionConfig)` - Update permission config
- `checkUpdatePermission(update: Uint8Array): boolean` - Check Y.js update permission

### Factory Functions

- `createProvider(options)` - Create standard or permission-aware provider
- `createSmartProvider(options)` - Auto-detect permission needs
- `createPermissionAwareProvider(config)` - Create permission-aware provider
- `createProviderWithPreset(options)` - Create provider with permission preset
- `upgradeToPermissionAware(provider, config)` - Upgrade existing provider

## Development and Debugging

### Debug Mode

```javascript
import { createDebugProvider } from '@hocuspocus/provider'

// Automatically enables detailed logging in development
const provider = createDebugProvider({
  url: 'ws://127.0.0.1:1234',
  name: 'document',
  enablePermissions: true
}, true) // Force debug mode
```

## Performance Considerations

- Permission checks are cached for optimal performance
- Client-side validation reduces server round trips
- Configurable cache timeout based on security needs
- Statistics tracking for optimization
- Minimal overhead when permissions not used

## Security Notes

- Client-side permission checks are for UX only
- Server-side validation is always authoritative  
- Tokens should be securely managed and rotated
- Permission caching should consider security requirements
- Always validate permissions on the server

## Testing

```bash
# Run provider tests
npx ava tests/provider/PermissionAwareProvider.ts --verbose

# Run integration tests
npm run test:provider
```

## License

Hocuspocus is open-sourced software licensed under the [MIT license](https://github.com/ueberdosis/hocuspocus/blob/main/LICENSE.md).