# Provider Permission System

The Hocuspocus provider includes a unified permission management system that provides enterprise-grade access control, seamlessly integrating with the server-side permission extension for comprehensive security.

## Quick Start

### Basic Provider Creation

The simplest way to create a provider with permission support:

```typescript
import { createProvider } from '@hocuspocus/provider';

// Automatic permission detection - enables permissions when token is provided
const provider = createProvider({
  name: 'my-document',
  url: 'ws://localhost:1234',
  token: 'your-auth-token' // Automatically enables permission system
});
```

### Manual Permission Configuration

For more control over permission settings:

```typescript
import { createProvider, ClientPermissionLevel } from '@hocuspocus/provider';

const provider = createProvider({
  name: 'my-document',
  url: 'ws://localhost:1234',
  token: 'your-auth-token',
  enablePermissions: true, // Explicitly enable permissions
  documentPermissionConfig: {
    level: ClientPermissionLevel.READ,
    allowedOperations: ['MAP_SET', 'MAP_DELETE'],
    allowedPaths: ['comments', 'annotations']
  }
});
```

## Permission Levels

The system supports three permission levels:

```typescript
enum ClientPermissionLevel {
  DENY = "deny",    // No access
  READ = "read",    // Read-only access  
  WRITE = "write"   // Full read-write access
}
```

## Permission Presets

Use built-in presets for common permission patterns:

### Read-Only Access

```typescript
import { createProviderWithPermissionPreset, PermissionPresets } from '@hocuspocus/provider';

const provider = createProviderWithPermissionPreset({
  name: 'shared-document',
  url: 'ws://localhost:1234',
  token: 'viewer-token'
}, 'ReadOnly');
```

### Comment-Only Access

Perfect for reviewers who can only add comments:

```typescript
const provider = createProviderWithPermissionPreset({
  name: 'review-document', 
  url: 'ws://localhost:1234',
  token: 'reviewer-token'
}, 'CommentOnly');
```

### Content Editor

Allows editing content but restricts system/admin paths:

```typescript
const provider = createProviderWithPermissionPreset({
  name: 'article-draft',
  url: 'ws://localhost:1234', 
  token: 'editor-token'
}, 'ContentEditor');
```

### Available Presets

```typescript
// All available permission presets
const presets = {
  ReadOnly: () => ({ level: ClientPermissionLevel.READ }),
  CommentOnly: () => ({
    level: ClientPermissionLevel.READ,
    allowedOperations: ['MAP_SET', 'MAP_DELETE'],
    allowedPaths: ['comments', 'annotations', 'suggestions']
  }),
  ContentEditor: () => ({
    level: ClientPermissionLevel.WRITE,
    deniedPaths: ['metadata.*', 'system.*', 'admin.*']
  }),
  Admin: () => ({ level: ClientPermissionLevel.WRITE }),
  Reviewer: () => ({
    level: ClientPermissionLevel.READ,
    allowedOperations: ['MAP_SET', 'MAP_DELETE'],
    allowedPaths: ['reviews', 'comments', 'annotations']
  })
};
```

## React Integration

### Basic Setup

```tsx
import React, { useEffect, useState } from 'react';
import { createProvider, ClientPermissionLevel } from '@hocuspocus/provider';
import * as Y from 'yjs';

function CollaborativeEditor() {
  const [provider, setProvider] = useState(null);
  const [doc] = useState(() => new Y.Doc());

  useEffect(() => {
    const newProvider = createProvider({
      name: 'react-document',
      document: doc,
      url: 'ws://localhost:1234',
      token: localStorage.getItem('authToken'),
      enablePermissions: true,
      documentPermissionConfig: {
        level: ClientPermissionLevel.WRITE
      }
    });

    setProvider(newProvider);

    return () => {
      newProvider.destroy();
    };
  }, [doc]);

  return (
    <div>
      <YourEditor doc={doc} />
      {provider && <PermissionStatus provider={provider} />}
    </div>
  );
}
```

### Permission Status Component

```tsx
import React, { useEffect, useState } from 'react';
import { isPermissionAwareProvider } from '@hocuspocus/provider';

function PermissionStatus({ provider }) {
  const [permission, setPermission] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (!isPermissionAwareProvider(provider)) return;

    // Listen for permission changes
    const handlePermissionChange = (event) => {
      setPermission(event.level);
      setIsReadOnly(event.level !== 'write');
    };

    provider.on('permission-change', handlePermissionChange);

    // Get initial permission state
    setPermission(provider.getPermissionLevel());
    setIsReadOnly(provider.isReadOnly());

    return () => {
      provider.off('permission-change', handlePermissionChange);
    };
  }, [provider]);

  if (!permission) return null;

  return (
    <div className={`permission-status ${permission}`}>
      Status: {permission === 'write' ? 'Full Access' : 
               permission === 'read' ? 'Read Only' : 'No Access'}
      {isReadOnly && <span className="readonly-indicator">🔒</span>}
    </div>
  );
}
```

### Permission-Aware Editor

```tsx
import React, { useCallback } from 'react';
import { isPermissionAwareProvider, canWrite } from '@hocuspocus/provider';

function PermissionAwareEditor({ provider, doc }) {
  const handleEdit = useCallback((operation) => {
    if (!isPermissionAwareProvider(provider)) {
      // Standard provider - perform operation directly
      performEdit(operation);
      return;
    }

    // Check if editing is allowed
    if (!canWrite(provider.getPermissionLevel())) {
      console.log('Edit blocked: insufficient permissions');
      showPermissionDeniedMessage();
      return;
    }

    performEdit(operation);
  }, [provider]);

  const performEdit = (operation) => {
    // Your edit logic here
    const yText = doc.getText('content');
    yText.insert(0, operation.text);
  };

  return (
    <div>
      <button 
        onClick={() => handleEdit({ text: 'Hello' })}
        disabled={provider && !canWrite(provider.getPermissionLevel())}
      >
        Add Text
      </button>
    </div>
  );
}
```

## Vue Integration

### Composition API

```typescript
// composables/useCollaborativeDoc.ts
import { ref, onUnmounted, computed } from 'vue';
import { createProvider, isPermissionAwareProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export function useCollaborativeDoc(documentName: string, token: string) {
  const doc = new Y.Doc();
  const provider = ref(null);
  const permissionLevel = ref('write');
  const isConnected = ref(false);

  const initProvider = () => {
    provider.value = createProvider({
      name: documentName,
      document: doc,
      url: 'ws://localhost:1234',
      token,
      enablePermissions: true
    });

    // Connection status
    provider.value.on('connect', () => {
      isConnected.value = true;
    });

    provider.value.on('disconnect', () => {
      isConnected.value = false;
    });

    // Permission events
    if (isPermissionAwareProvider(provider.value)) {
      provider.value.on('permission-change', (event) => {
        permissionLevel.value = event.level;
      });

      provider.value.on('permission-denied', (event) => {
        console.warn('Permission denied:', event.reason);
      });
    }
  };

  const isReadOnly = computed(() => {
    return permissionLevel.value !== 'write';
  });

  const canEdit = computed(() => {
    return permissionLevel.value === 'write';
  });

  initProvider();

  onUnmounted(() => {
    if (provider.value) {
      provider.value.destroy();
    }
  });

  return {
    doc,
    provider: provider.value,
    permissionLevel,
    isConnected,
    isReadOnly,
    canEdit
  };
}
```

### Vue Component

```vue
<template>
  <div class="collaborative-editor">
    <div class="status-bar">
      <span class="connection-status" :class="{ connected: isConnected }">
        {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}
      </span>
      <span class="permission-status" :class="permissionLevel">
        {{ permissionDisplayName }}
      </span>
    </div>
    
    <div class="editor-container">
      <textarea
        v-model="content"
        :readonly="isReadOnly"
        :placeholder="isReadOnly ? 'Read-only mode' : 'Start typing...'"
        @input="handleInput"
      />
    </div>

    <div class="toolbar">
      <button 
        @click="addComment"
        :disabled="!canComment"
      >
        Add Comment
      </button>
      <button 
        @click="formatText"
        :disabled="!canEdit"
      >
        Format Text
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCollaborativeDoc } from '@/composables/useCollaborativeDoc';
import { getPermissionDisplayName } from '@hocuspocus/provider';

const props = defineProps<{
  documentName: string;
  token: string;
}>();

const { 
  doc, 
  provider, 
  permissionLevel, 
  isConnected, 
  isReadOnly, 
  canEdit 
} = useCollaborativeDoc(props.documentName, props.token);

const permissionDisplayName = computed(() => {
  return getPermissionDisplayName(permissionLevel.value);
});

const canComment = computed(() => {
  // Can comment if has write access or specific comment permissions
  return canEdit.value || (
    permissionLevel.value === 'read' && 
    provider?.hasPathPermission(['comments'])
  );
});

const handleInput = (event) => {
  if (isReadOnly.value) {
    event.preventDefault();
    return;
  }
  
  // Update Y.js document
  const yText = doc.getText('content');
  yText.delete(0, yText.length);
  yText.insert(0, event.target.value);
};

const addComment = () => {
  if (!canComment.value) return;
  
  const comments = doc.getMap('comments');
  comments.set(`comment-${Date.now()}`, {
    text: 'New comment',
    author: 'current-user',
    timestamp: Date.now()
  });
};

const formatText = () => {
  if (!canEdit.value) return;
  
  // Apply formatting
  const yText = doc.getText('content');
  yText.format(0, yText.length, { bold: true });
};
</script>
```

## Advanced Configuration

### Custom Permission Logic

```typescript
import { 
  createProvider, 
  ClientPermissionLevel,
  YjsOperationType 
} from '@hocuspocus/provider';

const provider = createProvider({
  name: 'advanced-document',
  url: 'ws://localhost:1234',
  token: 'user-token',
  enablePermissions: true,
  documentPermissionConfig: {
    level: ClientPermissionLevel.WRITE,
    // Allow specific operations only
    allowedOperations: [
      YjsOperationType.TEXT_INSERT,
      YjsOperationType.TEXT_DELETE,
      YjsOperationType.MAP_SET
    ],
    // Restrict certain paths
    deniedPaths: [
      'system.*',
      'admin.*',
      'metadata.created'
    ],
    // Custom permission checker
    customChecker: (context) => {
      // Block large operations
      if (context.length && context.length > 1000) {
        return false;
      }
      
      // Block operations during certain hours
      const hour = new Date().getHours();
      if (hour < 9 || hour > 17) {
        return context.operation !== YjsOperationType.DELETE;
      }
      
      return true;
    }
  }
});
```

### Provider Upgrade

Upgrade an existing provider to enable permissions:

```typescript
import { upgradeToPermissionAware } from '@hocuspocus/provider';

// Existing standard provider
const standardProvider = new HocuspocusProvider({
  name: 'my-document',
  url: 'ws://localhost:1234'
});

// Upgrade to permission-aware
const permissionProvider = upgradeToPermissionAware(
  standardProvider,
  {
    level: ClientPermissionLevel.READ,
    allowedOperations: ['MAP_SET'],
    allowedPaths: ['comments']
  }
);
```

## Permission Events

### Available Events

```typescript
// Permission level changes
provider.on('permission-change', (event) => {
  console.log('Permission changed:', event.level);
  console.log('Previous level:', event.previousLevel);
});

// Operation denied by permissions
provider.on('permission-denied', (event) => {
  console.log('Operation denied:', event.operation);
  console.log('Reason:', event.reason);
  console.log('Path:', event.path);
});

// Permission state updates
provider.on('permission-update', (event) => {
  console.log('Permission state updated:', event);
});
```

### Event Handling Examples

```typescript
// React permission handler
useEffect(() => {
  if (!isPermissionAwareProvider(provider)) return;

  const handlePermissionDenied = (event) => {
    // Show user-friendly message
    toast.error(`Cannot perform operation: ${event.reason}`);
    
    // Log for debugging
    console.warn('Permission denied:', event);
  };

  const handlePermissionChange = (event) => {
    // Update UI state
    setPermissionLevel(event.level);
    
    // Notify user of permission changes
    if (event.level === 'read') {
      toast.info('Document is now read-only');
    } else if (event.level === 'write') {
      toast.success('Full editing access granted');
    }
  };

  provider.on('permission-denied', handlePermissionDenied);
  provider.on('permission-change', handlePermissionChange);

  return () => {
    provider.off('permission-denied', handlePermissionDenied);
    provider.off('permission-change', handlePermissionChange);
  };
}, [provider]);
```

## Utility Functions

### Permission Checking

```typescript
import { 
  canWrite, 
  canRead, 
  isModifyOperation,
  PermissionUtils 
} from '@hocuspocus/provider';

// Check permission levels
const userCanWrite = canWrite(ClientPermissionLevel.WRITE); // true
const userCanRead = canRead(ClientPermissionLevel.READ);    // true

// Check if operation modifies content
const isModifying = isModifyOperation(YjsOperationType.TEXT_INSERT); // true

// Use utility functions
const displayName = PermissionUtils.getPermissionDisplayName(ClientPermissionLevel.READ);
console.log(displayName); // "Read Only"
```

### Type Guards

```typescript
import { 
  isPermissionAwareProvider,
  TypeGuards 
} from '@hocuspocus/provider';

// Check if provider supports permissions
if (isPermissionAwareProvider(provider)) {
  // Safe to use permission methods
  const level = provider.getPermissionLevel();
  const isReadOnly = provider.isReadOnly();
}

// Event type guards
provider.on('permission-change', (event) => {
  if (TypeGuards.isPermissionChangeEvent(event)) {
    console.log('Valid permission change:', event.level);
  }
});
```

## Performance Optimization

### Permission Caching

The permission system includes built-in caching:

```typescript
const provider = createProvider({
  name: 'cached-document',
  url: 'ws://localhost:1234',
  token: 'user-token',
  enablePermissions: true,
  // Caching is automatically enabled
  documentPermissionConfig: {
    level: ClientPermissionLevel.WRITE
  }
});

// Access cached permission state
const cachedLevel = provider.getPermissionLevel(); // Fast, cached lookup
```

### Batch Operations

For better performance with multiple operations:

```typescript
// Group operations when possible
doc.transact(() => {
  const yText = doc.getText('content');
  yText.insert(0, 'Hello ');
  yText.insert(6, 'World');
  yText.format(0, 11, { bold: true });
}, 'batch-edit'); // Single permission check for the entire transaction
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createProvider, ClientPermissionLevel } from '@hocuspocus/provider';
import * as Y from 'yjs';

describe('Permission System', () => {
  let doc: Y.Doc;
  let provider;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  it('should create read-only provider', () => {
    provider = createProvider({
      name: 'test-doc',
      document: doc,
      url: 'ws://localhost:1234',
      token: 'read-token',
      documentPermissionConfig: {
        level: ClientPermissionLevel.READ
      }
    });

    expect(provider.isReadOnly()).toBe(true);
    expect(provider.getPermissionLevel()).toBe('read');
  });

  it('should block write operations in read-only mode', () => {
    provider = createProvider({
      name: 'test-doc',
      document: doc,
      url: 'ws://localhost:1234',
      documentPermissionConfig: {
        level: ClientPermissionLevel.READ
      }
    });

    const yText = doc.getText('content');
    
    // This should be blocked
    const permissionDeniedSpy = vi.fn();
    provider.on('permission-denied', permissionDeniedSpy);
    
    yText.insert(0, 'test');
    
    expect(permissionDeniedSpy).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
describe('Provider Permission Integration', () => {
  it('should sync permissions with server', async () => {
    const provider = createProvider({
      name: 'integration-test',
      url: 'ws://localhost:1234',
      token: 'test-token',
      enablePermissions: true
    });

    // Wait for connection and permission sync
    await new Promise(resolve => {
      provider.on('permission-update', resolve);
    });

    expect(provider.getPermissionLevel()).toBeDefined();
  });
});
```

## Migration Guide

### From Legacy Permission System

If you're upgrading from the legacy scattered permission files:

```typescript
// Before (legacy scattered system)
import { PermissionAwareProvider } from '@hocuspocus/provider/PermissionAwareProvider';
import { createPermissionAwareDocument } from '@hocuspocus/provider/PermissionAwareDocument';

// After (unified system)
import { createProvider, createProviderWithPermissionPreset } from '@hocuspocus/provider';

// Simple migration
const provider = createProvider({
  name: 'my-document',
  url: 'ws://localhost:1234',
  token: 'auth-token',
  enablePermissions: true // This replaces the old PermissionAwareProvider
});
```

### Upgrading Existing Providers

```typescript
import { upgradeToPermissionAware } from '@hocuspocus/provider';

// Your existing provider
const existingProvider = new HocuspocusProvider({
  name: 'document',
  url: 'ws://localhost:1234'
});

// Upgrade to add permissions
const upgradedProvider = upgradeToPermissionAware(existingProvider, {
  level: ClientPermissionLevel.READ
});
```

## Troubleshooting

### Common Issues

1. **Permission Sync Delays**
   ```typescript
   // Wait for permission sync before performing operations
   provider.on('permission-update', () => {
     // Now safe to check permissions
     const level = provider.getPermissionLevel();
   });
   ```

2. **Token Refresh**
   ```typescript
   // Handle token refresh
   provider.configuration.token = () => getRefreshedToken();
   ```

3. **Connection Issues**
   ```typescript
   provider.on('disconnect', () => {
     console.log('Permission state may be outdated');
   });
   ```

### Debug Mode

```typescript
const provider = createProvider({
  name: 'debug-document',
  url: 'ws://localhost:1234',
  token: 'debug-token',
  enablePermissions: true,
  // Enable debug logging
  onPermissionChange: (event) => {
    console.log('[DEBUG] Permission changed:', event);
  },
  onPermissionDenied: (event) => {
    console.log('[DEBUG] Permission denied:', event);
  }
});
```

## Security Best Practices

- ✅ Always validate permissions on the server side
- ✅ Use secure token transmission (HTTPS/WSS)
- ✅ Implement proper token refresh mechanisms  
- ✅ Handle permission changes gracefully in UI
- ✅ Never trust client-side permission state alone
- ✅ Log permission denials for security monitoring
- ✅ Use type guards to ensure permission-aware providers
- ✅ Test all permission scenarios thoroughly