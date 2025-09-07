# @hocuspocus/extension-permission

A comprehensive permission control extension for Hocuspocus that provides fine-grained access control at both document and Y.js operation levels.

## Installation

```bash
npm install @hocuspocus/extension-permission
```

## Quick Start

### Basic Permission Control

```javascript
import { Server } from '@hocuspocus/server'
import { Permission, PermissionLevel } from '@hocuspocus/extension-permission'

const server = new Server({
  extensions: [
    new Permission({
      getUser: (connection) => {
        // Extract user from URL parameters
        const url = connection.request?.url
        const userId = new URL(url, 'http://localhost').searchParams.get('userId')
        return userId ? { id: userId, role: userId } : null
      },
      
      getPermission: (user, documentName) => {
        if (!user) return { level: PermissionLevel.DENY }
        
        // Role-based permissions
        switch (user.role) {
          case 'admin': return { level: PermissionLevel.WRITE }
          case 'editor': return { level: PermissionLevel.WRITE }  
          case 'viewer': return { level: PermissionLevel.READ }
          default: return { level: PermissionLevel.DENY }
        }
      }
    }),
  ],
})

server.listen()
```

### Y.js Operation-Level Control

```javascript
import { YjsOperationType } from '@hocuspocus/extension-permission'

const server = new Server({
  extensions: [
    new Permission({
      getUser: getUserFromConnection,
      getPermission: (user, documentName) => {
        if (user.role === 'reviewer') {
          return {
            level: PermissionLevel.READ,
            allowedOperations: [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
            allowedPaths: ['comments', 'suggestions']
          }
        }
        return { level: PermissionLevel.WRITE }
      },
      
      // Custom operation checks
      checkOperation: (user, documentName, context) => {
        // Time-based restrictions
        const hour = new Date().getHours()
        if (hour < 9 || hour > 17) {
          return false
        }
        return true
      }
    }),
  ],
})
```

## Configuration Options

### getUser (required)
Function to extract user information from the WebSocket connection.

**Signature:** `(connection: any) => Promise<User | null> | User | null`

### getPermission (required)  
Function that returns permission configuration for a user and document.

**Signature:** `(user: User, documentName: string) => Promise<PermissionResult> | PermissionResult`

### checkOperation (optional)
Custom function for operation-level permission checks.

**Signature:** `(user: User, documentName: string, context: YjsOperationContext) => Promise<boolean> | boolean`

### timeout (optional)
Permission check timeout in milliseconds (default: 5000).

### enableLogging (optional)
Enable detailed permission logging (default: true).

### log (optional)
Custom logging function for permission events.

## Permission Levels

- **WRITE**: Full read/write access
- **READ**: Read-only access (can view and move cursor)  
- **DENY**: No access (connection refused)

## Advanced Features

### Path-Based Permissions

```javascript
getPermission: (user, documentName) => ({
  level: PermissionLevel.READ,
  allowedOperations: [YjsOperationType.MAP_SET],
  allowedPaths: ['comments.*', 'annotations'], // Supports wildcards
  deniedPaths: ['admin.*'] // Explicitly denied paths
})
```

### Helper Functions

```javascript
import { 
  createReadOnlyPermission,
  createCommentOnlyPermission,
  createPathRestrictedPermission,
  createRoleBasedPermission,
  createBasicPermissionChecker
} from '@hocuspocus/extension-permission'

// Create read-only access
const readOnly = createReadOnlyPermission()

// Allow only commenting
const commentOnly = createCommentOnlyPermission()

// Restrict to specific paths  
const pathRestricted = createPathRestrictedPermission(
  PermissionLevel.WRITE,
  ['content', 'metadata']
)

// Role-based permissions
const roleBased = createRoleBasedPermission('editor', {
  admin: { level: PermissionLevel.WRITE },
  editor: createPathRestrictedPermission(PermissionLevel.WRITE, ['content']),
  viewer: createReadOnlyPermission()
})

// Custom operation checker
const customChecker = createBasicPermissionChecker(
  [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
  ['comments']
)
```

### Document-Type Based Permissions

```javascript
getPermission: (user, documentName) => {
  // Admin-only documents
  if (documentName.startsWith('admin-') && user.role !== 'admin') {
    return { level: PermissionLevel.DENY }
  }
  
  // Public read-only documents
  if (documentName.startsWith('public-')) {
    return createReadOnlyPermission()
  }
  
  return { level: PermissionLevel.WRITE }
}
```

## Monitoring & Statistics

### Get Statistics

```javascript
// Get permission check statistics
const stats = permissionExtension.getStats()
console.log('Permission checks:', stats.permissionChecks)
console.log('Permission denials:', stats.permissionDenials)
console.log('Operation checks:', stats.operationChecks)
console.log('Operation denials:', stats.operationDenials)
```

### Custom Logging

```javascript
new Permission({
  getUser: getUserFromConnection,
  getPermission: getPermissionLogic,
  enableLogging: true,
  log: (message, level) => {
    console.log(`[${level?.toUpperCase()}] ${message}`)
    // Send to your logging service
  }
})
```

## Y.js Operation Types

The extension supports fine-grained control over these Y.js operations:

- **Basic**: `INSERT`, `DELETE`, `UPDATE`
- **Text**: `TEXT_INSERT`, `TEXT_DELETE`, `TEXT_FORMAT`
- **Array**: `ARRAY_INSERT`, `ARRAY_DELETE`, `ARRAY_MOVE`
- **Map**: `MAP_SET`, `MAP_DELETE`
- **XML**: `XML_INSERT`, `XML_DELETE`, `XML_ATTRIBUTE`
- **Transaction**: `TRANSACTION_START`, `TRANSACTION_COMMIT`, `TRANSACTION_ABORT`

## Error Handling

The extension provides `PermissionError` with detailed context:

```javascript
import { PermissionError } from '@hocuspocus/extension-permission'

try {
  // Permission operations
} catch (error) {
  if (error instanceof PermissionError) {
    console.log('User:', error.user)
    console.log('Document:', error.documentName)
    console.log('Context:', error.context)
  }
}
```

## Testing & Debugging

### CLI Usage

```bash
# Run permission playground
npm run playground:permission

# Run tests
npx ava tests/extension-permission/Permission.ts --verbose
```

### Enable Detailed Logging

```javascript
new Permission({
  getUser: getUserFromConnection,
  getPermission: getPermissionLogic,
  enableLogging: process.env.NODE_ENV === 'development',
  timeout: 3000
})
```

## Complete Documentation

For detailed documentation, examples, and advanced usage patterns, see:
[📚 Permission Extension Documentation](https://tiptap.dev/docs/hocuspocus/server/extensions/permission)

## Architecture

The permission system operates on three levels:

1. **Connection Level**: User authentication and basic document access
2. **Permission Level**: Role-based access control (WRITE/READ/DENY)  
3. **Operation Level**: Fine-grained Y.js operation filtering

This layered approach ensures security while maintaining performance and flexibility.