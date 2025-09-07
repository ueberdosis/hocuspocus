# Extension Permission

Enterprise-grade permission control extension providing fine-grained document and operation-level access management with callback-based permission validation and Y.js operation-level control.

## Installation

```bash
npm install @hocuspocus/extension-permission
```

## Core Concepts

### Permission Levels

```typescript
enum PermissionLevel {
  DENY = 'DENY',    // Deny access
  READ = 'READ',    // Read-only permission
  WRITE = 'WRITE'   // Read-write permission
}
```

### Y.js Operation Types

The extension supports fine-grained control over all Y.js operations:

```typescript
enum YjsOperationType {
  // Basic operations
  INSERT = 'insert',
  DELETE = 'delete', 
  UPDATE = 'update',
  
  // Text operations
  TEXT_INSERT = 'text_insert',
  TEXT_DELETE = 'text_delete',
  TEXT_FORMAT = 'text_format',
  
  // Array operations
  ARRAY_INSERT = 'array_insert',
  ARRAY_DELETE = 'array_delete', 
  ARRAY_MOVE = 'array_move',
  
  // Map operations
  MAP_SET = 'map_set',
  MAP_DELETE = 'map_delete',
  
  // XML operations
  XML_INSERT = 'xml_insert',
  XML_DELETE = 'xml_delete',
  XML_ATTRIBUTE = 'xml_attribute',
  
  // Transaction operations
  TRANSACTION_START = 'transaction_start',
  TRANSACTION_COMMIT = 'transaction_commit',
  TRANSACTION_ABORT = 'transaction_abort'
}
```

## Configuration Options

### Required Configuration

```typescript
interface PermissionConfig {
  // Extract user identity from WebSocket connection
  getUser: (connection: unknown) => Promise<User | null> | User | null;
  
  // Check user permissions for document access
  getPermission: (user: User, documentName: string) => Promise<PermissionResult> | PermissionResult;
}
```

### Optional Configuration

```typescript
interface PermissionConfig {
  // Operation-level permission check (optional, for fine-grained control)
  checkOperation?: (user: User, documentName: string, context: YjsOperationContext) => Promise<boolean> | boolean;
  
  // Permission check timeout in milliseconds (default: 5000)
  timeout?: number;
  
  // Enable detailed logging (default: true)
  enableLogging?: boolean;
  
  // Custom logging function
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
  
  // Hook called when permission is denied
  onPermissionDenied?: (context: PermissionDeniedContext) => void;
  
  // Hook called when permission is granted
  onPermissionGranted?: (context: PermissionGrantedContext) => void;
  
  // Hook called when operation is denied
  onOperationDenied?: (context: OperationDeniedContext) => void;
}
```

## Basic Usage

### Simple Permission Control

```typescript
import { Server } from "@hocuspocus/server";
import { Permission, PermissionLevel } from "@hocuspocus/extension-permission";

const server = new Server({
  extensions: [
    new Permission({
      getUser: (connection) => {
        // Extract user identity from connection
        const token = extractToken(connection);
        return authenticateUser(token);
      },
      
      getPermission: (user, documentName) => {
        // Return permissions based on user role
        if (user.role === 'admin') {
          return { level: PermissionLevel.WRITE };
        }
        if (user.role === 'editor') {
          return { level: PermissionLevel.WRITE };
        }
        if (user.role === 'viewer') {
          return { level: PermissionLevel.READ };
        }
        return { level: PermissionLevel.DENY };
      }
    })
  ]
});
```

### Enterprise Token Authentication

```typescript
import jwt from 'jsonwebtoken';
import { Permission, PermissionLevel } from "@hocuspocus/extension-permission";

new Permission({
  getUser: async (connection) => {
    try {
      // Support multiple token extraction methods
      const token = extractTokenFromConnection(connection);
      
      if (!token) {
        console.log('[Auth] No authentication token provided');
        return null;
      }
      
      // JWT verification
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.userId);
      
      return user;
    } catch (error) {
      console.error('[Auth] Authentication error:', error);
      return null;
    }
  },
  
  getPermission: async (user, documentName) => {
    try {
      // Get document permissions from database
      const permission = await DocumentPermission.findOne({
        userId: user.id,
        documentName
      });
      
      if (!permission) {
        return { level: PermissionLevel.DENY };
      }
      
      return {
        level: permission.canWrite ? PermissionLevel.WRITE : PermissionLevel.READ
      };
    } catch (error) {
      console.error('[Permission] Permission check error:', error);
      return { level: PermissionLevel.DENY };
    }
  },
  
  timeout: 3000, // Database operation timeout control
  enableLogging: true
});

// Token extraction helper function
function extractTokenFromConnection(connection) {
  const request = connection.request;
  
  // 1. Authorization header
  const authHeader = request?.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 2. URL parameter
  const url = new URL(request?.url || '', 'http://localhost');
  const urlToken = url.searchParams.get('token');
  if (urlToken) {
    return urlToken;
  }
  
  // 3. Cookie
  const cookieHeader = request?.headers?.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.substring(6);
    }
  }
  
  return null;
}
```

## Fine-Grained Permission Control

### Document Type-Based Permissions

```typescript
new Permission({
  getUser: getUserFromConnection,
  getPermission: (user, documentName) => {
    if (!user) return { level: PermissionLevel.DENY };
    
    // Admin documents
    if (documentName.startsWith('admin-') && user.role !== 'admin') {
      return { level: PermissionLevel.DENY };
    }
    
    // Public read-only documents
    if (documentName.startsWith('public-')) {
      return { level: PermissionLevel.READ };
    }
    
    // Private documents - check ownership
    if (documentName.startsWith('private-')) {
      const ownerId = documentName.split('-')[1];
      if (user.id !== ownerId && user.role !== 'admin') {
        return { level: PermissionLevel.DENY };
      }
    }
    
    return { level: PermissionLevel.WRITE };
  }
});
```

### Path and Operation-Level Control

```typescript
import { YjsOperationType } from "@hocuspocus/extension-permission";

new Permission({
  getUser: getUserFromConnection,
  getPermission: (user, documentName) => {
    if (user.role === 'reviewer') {
      return {
        level: PermissionLevel.READ,
        // Only allow specific operations
        allowedOperations: [
          YjsOperationType.MAP_SET,
          YjsOperationType.MAP_DELETE
        ],
        // Only allow operations on specific paths
        allowedPaths: ['comments', 'suggestions', 'annotations']
      };
    }
    
    if (user.role === 'content_editor') {
      return {
        level: PermissionLevel.WRITE,
        // Allow content editing but restrict admin settings
        deniedPaths: ['admin.*', 'system.*', 'metadata.*']
      };
    }
    
    return { level: PermissionLevel.WRITE };
  },
  
  // Custom business rules
  checkOperation: (user, documentName, context) => {
    // Working hours restriction: non-admins cannot delete during work hours
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 17 && user.role !== 'admin') {
      const deleteOperations = [
        YjsOperationType.DELETE,
        YjsOperationType.TEXT_DELETE,
        YjsOperationType.ARRAY_DELETE,
        YjsOperationType.MAP_DELETE
      ];
      if (deleteOperations.includes(context.operation)) {
        return false;
      }
    }
    
    // Limit large operations
    if (context.length && context.length > 1000 && user.role === 'user') {
      return false;
    }
    
    return true;
  }
});
```

## Built-in Utility Functions

### Common Permission Presets

```typescript
import { 
  createReadOnlyPermission,
  createCommentOnlyPermission,
  createPathRestrictedPermission,
  createRoleBasedPermission,
  createTimeRestrictedChecker
} from "@hocuspocus/extension-permission";

new Permission({
  getUser: getUserFromConnection,
  getPermission: (user, documentName) => {
    // Read-only permission
    if (user.role === 'viewer') {
      return createReadOnlyPermission();
    }
    
    // Comment permission (can only add comments)
    if (user.role === 'commenter') {
      return createCommentOnlyPermission();
    }
    
    // Path-restricted permission
    if (user.role === 'content_editor') {
      return createPathRestrictedPermission(
        PermissionLevel.WRITE,
        ['content', 'metadata']
      );
    }
    
    // Role-based permission mapping
    return createRoleBasedPermission(user.role, {
      admin: { level: PermissionLevel.WRITE },
      editor: createPathRestrictedPermission(PermissionLevel.WRITE, ['content']),
      viewer: createReadOnlyPermission()
    });
  }
});
```

### Custom Permission Checkers

```typescript
import { 
  createBasicPermissionChecker,
  combinePermissionCheckers
} from "@hocuspocus/extension-permission";

// Basic permission checker
const commentChecker = createBasicPermissionChecker(
  [YjsOperationType.MAP_SET, YjsOperationType.MAP_DELETE],
  ['comments', 'annotations']
);

// Time-restricted checker
const timeChecker = createTimeRestrictedChecker(9, 17, [
  YjsOperationType.TEXT_INSERT,
  YjsOperationType.TEXT_FORMAT
]);

// Combine multiple checkers
const combinedChecker = combinePermissionCheckers([
  commentChecker,
  timeChecker
], 'AND'); // 'AND' or 'OR' mode

new Permission({
  getUser: getUserFromConnection,
  getPermission: (user, documentName) => ({
    level: PermissionLevel.READ,
    customChecker: combinedChecker
  })
});
```

## Event Handling and Monitoring

### Permission Event Hooks

```typescript
new Permission({
  getUser: getUserFromConnection,
  getPermission: getPermissionFromDatabase,
  
  onPermissionGranted: (context) => {
    console.log(`✅ Access granted: ${context.user.username} (${context.user.role}) → ${context.documentName} [${context.permission.level}]`);
    // Log access
    logAccess(context.user, context.documentName, 'granted');
  },
  
  onPermissionDenied: (context) => {
    console.log(`❌ Access denied: ${context.user?.username || 'anonymous'} → ${context.documentName} - ${context.reason}`);
    // Log denial and security events
    logSecurityEvent(context.user, context.documentName, 'denied', context.reason);
  },
  
  onOperationDenied: (context) => {
    console.log(`🚫 Operation denied: ${context.user.username} → ${context.operation.operation} on ${context.operation.path?.join('.')} - ${context.reason}`);
    // Log operation denial events
    logOperationDenied(context.user, context.operation, context.reason);
  }
});
```

### Statistics and Monitoring

```typescript
const permissionExtension = new Permission({
  getUser: getUserFromConnection,
  getPermission: getPermissionFromDatabase,
  enableLogging: true,
  log: (message, level) => {
    // Send to logging service
    logger[level || 'info'](`[Permission] ${message}`);
  }
});

// Get statistics
setInterval(() => {
  const stats = permissionExtension.getStats();
  console.log('Permission Statistics:', {
    'Permission Checks': stats.permissionChecks,
    'Permission Denials': stats.permissionDenials,
    'Operation Checks': stats.operationChecks,
    'Operation Denials': stats.operationDenials,
    'Denial Rate': `${((stats.permissionDenials / stats.permissionChecks) * 100).toFixed(2)}%`
  });
}, 60000);
```

## Path Matching Patterns

Supports flexible wildcard path matching:

```typescript
{
  level: PermissionLevel.WRITE,
  allowedPaths: [
    'content',           // Exact match
    'comments.*',        // Match all sub-paths under comments
    '*.meta',           // Match any path ending with .meta
    'admin.*'           // Match all admin-related paths
  ],
  deniedPaths: [
    'system.*',         // Deny access to system paths
    'private.sensitive' // Deny access to sensitive data
  ]
}
```

## Error Handling

### Permission Exceptions

```typescript
import { PermissionError } from "@hocuspocus/extension-permission";

try {
  // Permission operations
} catch (error) {
  if (error instanceof PermissionError) {
    console.log('Permission denied for user:', error.user?.id);
    console.log('Document:', error.documentName);
    console.log('Context:', error.context);
  }
}
```

### Fail-Safe Mechanisms

```typescript
new Permission({
  getUser: async (connection) => {
    try {
      return await authenticateUser(connection);
    } catch (error) {
      // Fail-safe: deny access on authentication failure
      return null;
    }
  },
  
  getPermission: async (user, documentName) => {
    try {
      return await getPermissionFromDatabase(user, documentName);
    } catch (error) {
      console.error('Permission check failed:', error);
      // Fail-safe: deny access on error
      return { level: PermissionLevel.DENY };
    }
  },
  
  timeout: 5000, // Timeout protection
  enableLogging: true
});
```

## Performance Optimization

### Permission Caching

```typescript
const permissionCache = new Map();

new Permission({
  getUser: getUserFromConnection,
  getPermission: async (user, documentName) => {
    // Permission cache key
    const cacheKey = `${user.id}:${documentName}`;
    
    // Check cache
    if (permissionCache.has(cacheKey)) {
      const cached = permissionCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5-minute cache
        return cached.permission;
      }
    }
    
    // Get permission from database
    const permission = await getPermissionFromDatabase(user, documentName);
    
    // Update cache
    permissionCache.set(cacheKey, {
      permission,
      timestamp: Date.now()
    });
    
    return permission;
  },
  
  timeout: 2000 // Shorter timeout
});

// Periodic cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of permissionCache.entries()) {
    if (now - value.timestamp > 300000) {
      permissionCache.delete(key);
    }
  }
}, 60000);
```

### Batch Permission Checks

```typescript
// For scenarios with many users, consider batch permission checks
const batchPermissionCache = new Map();

new Permission({
  getUser: getUserFromConnection,
  getPermission: async (user, documentName) => {
    // Batch load all user permissions
    if (!batchPermissionCache.has(user.id)) {
      const allPermissions = await getUserAllPermissions(user.id);
      batchPermissionCache.set(user.id, {
        permissions: allPermissions,
        timestamp: Date.now()
      });
    }
    
    const userPermissions = batchPermissionCache.get(user.id);
    return userPermissions.permissions[documentName] || { level: PermissionLevel.DENY };
  }
});
```

## Production Deployment

### Environment Configuration

```bash
# Environment variables
PORT=1234                           # Server port
NODE_ENV=production                 # Environment mode
JWT_SECRET=your_jwt_secret_key      # JWT secret
DB_CONNECTION_STRING=your_db_url    # Database connection
PERMISSION_CACHE_TTL=300000         # Permission cache TTL (milliseconds)
PERMISSION_TIMEOUT=3000             # Permission check timeout
```

### Production Configuration

```typescript
new Permission({
  getUser: getUserFromJWT,
  getPermission: getPermissionFromCache,
  
  // Production settings
  enableLogging: process.env.NODE_ENV === 'development',
  timeout: Number(process.env.PERMISSION_TIMEOUT) || 2000,
  
  // Send to logging service
  log: (message, level) => {
    logger[level || 'info']('Permission', { 
      message, 
      service: 'hocuspocus',
      timestamp: new Date().toISOString()
    });
  }
});
```

### Security Checklist

- ✅ Server-side permission validation (never trust client-side)
- ✅ Secure token generation and verification mechanisms
- ✅ Appropriate permission check timeouts
- ✅ Fail-safe mechanisms (deny access on errors)
- ✅ Detailed permission and security event logging
- ✅ Permission caching and performance optimization
- ✅ Business rule enforcement
- ✅ Test coverage for all permission scenarios

## Testing and Debugging

### Unit Testing

```bash
# Run permission extension tests
npx ava tests/extension-permission/Permission.ts --verbose

# Test specific scenarios
npx ava tests/extension-permission/ --match="*token*" --verbose
```

### Development Debugging

```typescript
new Permission({
  getUser: getUserFromConnection,
  getPermission: getPermissionFromDatabase,
  
  // Development environment detailed logging
  enableLogging: process.env.NODE_ENV === 'development',
  log: (message, level) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level?.toUpperCase() || 'INFO'}] Permission: ${message}`);
    }
  },
  
  // Debug hooks
  onPermissionGranted: (context) => {
    console.log('🔓 Permission granted:', context);
  },
  onPermissionDenied: (context) => {
    console.log('🔒 Permission denied:', context);
  },
  onOperationDenied: (context) => {
    console.log('⚠️  Operation denied:', context);
  }
});
```

### Interactive Playground

Start the permission control demo environment:

```bash
# Start backend permission server
cd playground/backend && node --experimental-transform-types src/permission.ts

# Start frontend demo (in another terminal)
cd playground/frontend && npm run dev
```

Visit `http://localhost:3000/permissions` to experience complete permission control functionality.

Demo tokens:
- `demo_admin` - Administrator (full permissions)
- `demo_editor` - Editor (write permissions + path restrictions)
- `demo_reviewer` - Reviewer (comment permissions)
- `demo_viewer` - Viewer (read-only permissions)
- `demo_guest` - Guest (limited access)