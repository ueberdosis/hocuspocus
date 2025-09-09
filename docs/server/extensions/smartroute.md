# Extension SmartRoute

The SmartRoute extension provides intelligent document routing for Hocuspocus clusters using consistent hashing algorithms. It ensures that documents are always routed to the same node, eliminating distributed lock contention and improving overall cluster performance and reliability.

## Installation

Install the SmartRoute extension with:

```bash
npm install @hocuspocus/extension-smartroute
```

## Basic Usage

### Single Node Setup

For single-node setups, SmartRoute provides routing infrastructure without enforcement:

```js
import { Server } from "@hocuspocus/server";
import { SmartRoute } from "@hocuspocus/extension-smartroute";

const server = new Server({
  extensions: [
    new SmartRoute({
      nodeId: "node-1",
      nodeAddress: "127.0.0.1",
      nodePort: 8000,
      enforceRouting: false, // Disable for single node
    }),
  ],
});

server.listen();
```

### Cluster Configuration

For multi-node clusters, SmartRoute enforces routing rules and enables load balancing:

```js
import { Server } from "@hocuspocus/server";
import { SmartRoute } from "@hocuspocus/extension-smartroute";
import { Redis } from "@hocuspocus/extension-redis";

const server = new Server({
  extensions: [
    new SmartRoute({
      // Current node configuration
      nodeId: "node-1",
      nodeAddress: "127.0.0.1", 
      nodePort: 8000,
      nodeWeight: 1,

      // Cluster nodes
      clusterNodes: [
        { id: "node-2", address: "127.0.0.1", port: 8001, weight: 1 },
        { id: "node-3", address: "127.0.0.1", port: 8002, weight: 2 },
      ],

      // Routing behavior
      enforceRouting: true,
      redirectOnMisroute: true,

      // Health monitoring
      healthCheck: {
        interval: 5000,
        timeout: 3000,
        retries: 3,
        backoffMultiplier: 2,
        maxBackoff: 30000,
      },
    }),

    // Required for cluster communication
    new Redis({
      host: "127.0.0.1",
      port: 6379,
    }),
  ],
});

server.listen();
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
| `syncInterval` | number | `30000` | Cluster sync interval (ms) |
| `migrationTimeout` | number | `60000` | Document migration timeout (ms) |

## Architecture

SmartRoute implements a consistent hashing algorithm with the following components:

### Consistent Hash Ring

Documents are mapped to nodes using a hash ring with virtual nodes to ensure even distribution. Each physical node is represented by multiple virtual nodes (default: 150) to improve load balancing.

### Health Monitoring

The extension continuously monitors cluster node health using configurable health checks:
- **TCP Ping**: Basic connectivity testing
- **HTTP Health Endpoint**: Application-level health verification  
- **Exponential Backoff**: Intelligent retry strategy for failed checks

### Document Migration

When nodes join or leave the cluster, affected documents are safely migrated:
- **Atomic Transfer**: Documents are transferred without data loss
- **Timeout Protection**: Migration operations have configurable timeouts
- **State Synchronization**: Cluster state remains consistent during migrations

## Advanced Features

### Custom Routing Strategy

Implement custom routing logic for specific business requirements:

```js
new SmartRoute({
  // ... basic configuration

  customRoutingFunction: (documentId, availableNodes) => {
    // Route user documents to high-performance nodes
    if (documentId.startsWith('user-')) {
      return availableNodes.find(n => n.weight > 1) || availableNodes[0];
    }

    // Use default consistent hashing for other documents
    return null;
  }
});
```

### Dynamic Node Management

Add or remove nodes during runtime:

```js
const smartRoute = new SmartRoute({/* config */});

// Add a new node to the cluster
await smartRoute.addClusterNode({
  id: 'node-4',
  address: '127.0.0.1',
  port: 8003,
  weight: 1
});

// Remove a node from the cluster
await smartRoute.removeClusterNode('node-4');
```

## Kubernetes Deployment

SmartRoute is designed for cloud-native deployment. Use StatefulSets to ensure consistent node identities:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: hocuspocus-cluster
spec:
  serviceName: hocuspocus
  replicas: 3
  selector:
    matchLabels:
      app: hocuspocus
  template:
    metadata:
      labels:
        app: hocuspocus
    spec:
      containers:
      - name: hocuspocus
        image: hocuspocus:latest
        env:
        - name: NODE_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_PORT
          value: "8000"
        ports:
        - containerPort: 8000
```

### Application Configuration for Kubernetes

```js
const NODE_NAME = process.env.NODE_ID || 'unknown-node';
const POD_IP = process.env.POD_IP || '127.0.0.1';

// Build cluster nodes list dynamically
const clusterNodes = [];
for (let i = 0; i < 3; i++) { // Adjust based on replica count
  if (`hocuspocus-${i}` !== NODE_NAME) {
    clusterNodes.push({
      id: `hocuspocus-${i}`,
      address: `hocuspocus-${i}.hocuspocus.svc.cluster.local`,
      port: 8000,
      weight: 1,
    });
  }
}

const server = new Server({
  extensions: [
    new SmartRoute({
      nodeId: NODE_NAME,
      nodeAddress: POD_IP,
      nodePort: 8000,
      clusterNodes,
      enforceRouting: true,
    }),
    new Redis({
      host: process.env.REDIS_HOST || 'redis-service',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }),
  ],
});
```

### Health Checks for Kubernetes

Implement health check endpoints for Kubernetes probes:

```js
import express from 'express';

const healthApp = express();

healthApp.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    node: process.env.NODE_ID,
    uptime: process.uptime(),
  });
});

healthApp.get('/ready', (req, res) => {
  const smartRoute = server.extensions.find(ext => ext.constructor.name === 'SmartRoute');
  const isReady = smartRoute?.isInitialized;
  
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not_ready' });
  }
});

healthApp.listen(8080);
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hocuspocus-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: hocuspocus-cluster
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring and Management

SmartRoute provides built-in monitoring capabilities:

```bash
# Get routing statistics
curl http://127.0.0.1:8080/api/routes/stats

# Query document routing
curl http://127.0.0.1:8080/api/routes/document/my-document

# Manually migrate document
curl -X POST http://127.0.0.1:8080/api/routes/migrate \
  -H "Content-Type: application/json" \
  -d '{"documentId": "my-document", "targetNodeId": "node-2"}'
```

## Performance Benefits

SmartRoute provides significant performance improvements in cluster environments:

- **Eliminates Lock Contention**: No distributed locking required
- **Predictable Routing**: Documents consistently route to designated nodes  
- **Improved Throughput**: Reduced coordination overhead between nodes
- **Better Cache Efficiency**: Documents stay on their assigned nodes

## Troubleshooting

### Common Issues

**Node cannot join cluster**
- Verify network connectivity between nodes
- Check Redis configuration and accessibility
- Review node logs for connection errors

**Document routing inconsistencies**  
- Ensure all nodes have identical cluster configuration
- Verify consistent hash algorithm parameters
- Resynchronize cluster state through Redis

**Health checks failing frequently**
- Increase health check timeout values
- Check node resource utilization
- Optimize network configuration between nodes

### Debug Logging

Enable detailed logging to troubleshoot routing issues:

```js
new SmartRoute({
  // configuration
  debugMode: true, // Enable debug logging
});
```

## Best Practices

1. **Node Weights**: Assign weights based on hardware capabilities
2. **Health Check Tuning**: Adjust timeouts based on network latency
3. **Redis Configuration**: Use Redis clustering for high availability  
4. **Gradual Scaling**: Add/remove nodes during low traffic periods
5. **Monitor Migration**: Track document migration progress and completion