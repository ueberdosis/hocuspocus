# @hocuspocus/extension-smartroute

An intelligent document routing extension for Hocuspocus that uses consistent hashing to ensure documents are always routed to the same node, eliminating distributed lock contention and improving cluster performance.

## Installation

```bash
npm install @hocuspocus/extension-smartroute
```

## Quick Start

### Single Node Configuration

```javascript
import { Server } from '@hocuspocus/server'
import { SmartRoute } from '@hocuspocus/extension-smartroute'

const server = new Server({
  extensions: [
    new SmartRoute({
      nodeId: 'node-1',
      nodeAddress: '127.0.0.1',
      nodePort: 8000,
      enforceRouting: false, // Disable routing enforcement for single node
    })
  ]
})

server.listen()
```

### Cluster Configuration

```javascript
import { Server } from '@hocuspocus/server'
import { SmartRoute } from '@hocuspocus/extension-smartroute'
import { Redis } from '@hocuspocus/extension-redis'

const server = new Server({
  extensions: [
    new SmartRoute({
      nodeId: 'node-1',
      nodeAddress: '127.0.0.1',
      nodePort: 8000,
      nodeWeight: 1,
      
      clusterNodes: [
        { id: 'node-2', address: '127.0.0.1', port: 8001, weight: 1 },
        { id: 'node-3', address: '127.0.0.1', port: 8002, weight: 2 },
      ],
      
      enforceRouting: true,
      redirectOnMisroute: true,
      
      healthCheck: {
        interval: 5000,
        timeout: 3000,
        retries: 3,
      },
    }),
    
    new Redis({ host: '127.0.0.1', port: 6379 }),
  ]
})

server.listen()
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `nodeId` | string | auto-generated | Unique identifier for current node |
| `nodeAddress` | string | `'127.0.0.1'` | Current node's IP address |
| `nodePort` | number | `80` | Current node's port |
| `nodeWeight` | number | `1` | Node weight for load balancing |
| `clusterNodes` | array | `[]` | List of other cluster nodes |
| `enforceRouting` | boolean | `true` | Enable strict routing enforcement |
| `redirectOnMisroute` | boolean | `false` | Redirect misrouted requests |
| `healthCheck` | object | - | Health check configuration |

## Features

- **Consistent Hash Routing**: Documents always route to the same node
- **Zero Lock Contention**: Eliminates distributed lock competition
- **Smart Failover**: Automatic node failure detection and re-routing
- **Dynamic Scaling**: Runtime node addition/removal support
- **Health Monitoring**: Real-time cluster node status tracking
- **Document Migration**: Safe document transfer between nodes

## Development

### Quick Start

```bash
# Build packages
npm run build:packages

# Run tests
npm test tests/extension-smartroute

# Start playground examples
npm run playground:smartroute
npm run playground:smartroute-cluster
```

### Environment Variables

For cluster examples:
- `NODE_ID`: Node identifier (e.g., 'node-1', 'node-2')
- `NODE_PORT`: WebSocket port (default: 8000)
- `NODE_ADDRESS`: Node IP address (default: '127.0.0.1')
- `REDIS_HOST`: Redis host (default: '127.0.0.1')
- `REDIS_PORT`: Redis port (default: 6379)

## Documentation

For complete documentation including architecture details, Kubernetes deployment, advanced features, and troubleshooting guides:

📚 **[SmartRoute Extension Documentation](../../docs/server/extensions/smartroute.md)**

## Performance Benefits

- **Eliminates Lock Contention**: No more distributed lock competition between nodes
- **Predictable Routing**: Same document always goes to the same node
- **Improved Throughput**: Reduced coordination overhead
- **Better Cache Efficiency**: Documents stay on their designated nodes
- **Simplified Architecture**: No distributed locking mechanisms needed