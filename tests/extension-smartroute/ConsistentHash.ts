import test from 'ava';
import { ConsistentHash, type Node } from '../../packages/extension-smartroute/src/ConsistentHash.ts';

test('should be able to add and retrieve nodes', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    weight: 1,
    isHealthy: true
  };
  
  hash.addNode(node1);
  
  const nodes = hash.getAllNodes();
  t.is(nodes.length, 1);
  t.is(nodes[0].id, 'node-1');
});

test('should be able to remove nodes', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    isHealthy: true
  };
  
  hash.addNode(node1);
  t.is(hash.getAllNodes().length, 1);
  
  hash.removeNode('node-1');
  t.is(hash.getAllNodes().length, 0);
});

test('should support node weights', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    weight: 1,
    isHealthy: true
  };
  
  const node2: Node = {
    id: 'node-2',
    address: '127.0.0.1',
    port: 8001,
    weight: 3,
    isHealthy: true
  };
  
  hash.addNode(node1);
  hash.addNode(node2);
  
  // Test distribution across multiple documents, higher weight node should get more documents
  const documentCount = 100;
  const distribution = new Map<string, number>();
  
  for (let i = 0; i < documentCount; i++) {
    const node = hash.getNode(`document-${i}`);
    if (node) {
      distribution.set(node.id, (distribution.get(node.id) || 0) + 1);
    }
  }
  
  // node2 has 3x weight of node1, should handle more documents
  const node1Count = distribution.get('node-1') || 0;
  const node2Count = distribution.get('node-2') || 0;
  t.true(node2Count > node1Count);
});

test('should perform failover when nodes are unhealthy', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    isHealthy: true
  };
  
  const node2: Node = {
    id: 'node-2',
    address: '127.0.0.1',
    port: 8001,
    isHealthy: true
  };
  
  hash.addNode(node1);
  hash.addNode(node2);
  
  // Mark node1 as unhealthy
  hash.markNodeUnhealthy('node-1');
  
  // All documents should route to healthy node2
  const documents = ['doc-1', 'doc-2', 'doc-3'];
  for (const doc of documents) {
    const node = hash.getNode(doc);
    t.truthy(node);
    t.is(node!.id, 'node-2');
  }
});

test('same document should always route to same node', t => {
  const hash = new ConsistentHash();
  
  const nodes: Node[] = [
    { id: 'node-1', address: '127.0.0.1', port: 8000, isHealthy: true },
    { id: 'node-2', address: '127.0.0.1', port: 8001, isHealthy: true },
    { id: 'node-3', address: '127.0.0.1', port: 8002, isHealthy: true }
  ];
  
  nodes.forEach(node => hash.addNode(node));
  
  const documentId = 'test-document';
  
  // Multiple retrievals should return same node
  const node1 = hash.getNode(documentId);
  const node2 = hash.getNode(documentId);
  const node3 = hash.getNode(documentId);
  
  t.truthy(node1);
  t.is(node1!.id, node2!.id);
  t.is(node2!.id, node3!.id);
});

test('should correctly get node statistics', t => {
  const hash = new ConsistentHash();
  
  const nodes: Node[] = [
    { id: 'node-1', address: '127.0.0.1', port: 8000, isHealthy: true },
    { id: 'node-2', address: '127.0.0.1', port: 8001, isHealthy: false },
    { id: 'node-3', address: '127.0.0.1', port: 8002, isHealthy: true }
  ];
  
  nodes.forEach(node => hash.addNode(node));
  
  const allNodes = hash.getAllNodes();
  const healthyNodes = hash.getHealthyNodes();
  
  t.is(allNodes.length, 3);
  t.is(healthyNodes.length, 2);
  
  const healthyNodeIds = healthyNodes.map(n => n.id);
  t.true(healthyNodeIds.includes('node-1'));
  t.false(healthyNodeIds.includes('node-2'));
  t.true(healthyNodeIds.includes('node-3'));
});

// Edge cases and error conditions
test('should handle empty cluster scenario', t => {
  const hash = new ConsistentHash();
  
  // No nodes added
  const node = hash.getNode('any-document');
  t.is(node, null);
  
  const allNodes = hash.getAllNodes();
  const healthyNodes = hash.getHealthyNodes();
  
  t.is(allNodes.length, 0);
  t.is(healthyNodes.length, 0);
});

test('should handle all nodes unhealthy scenario', t => {
  const hash = new ConsistentHash();
  
  const nodes: Node[] = [
    { id: 'node-1', address: '127.0.0.1', port: 8000, isHealthy: false },
    { id: 'node-2', address: '127.0.0.1', port: 8001, isHealthy: false },
    { id: 'node-3', address: '127.0.0.1', port: 8002, isHealthy: false }
  ];
  
  nodes.forEach(node => hash.addNode(node));
  
  // Should return null when no healthy nodes available
  const node = hash.getNode('any-document');
  t.is(node, null);
  
  const healthyNodes = hash.getHealthyNodes();
  t.is(healthyNodes.length, 0);
});

test('should handle invalid node removal', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    isHealthy: true
  };
  
  hash.addNode(node1);
  
  // Remove non-existent node should not cause errors
  hash.removeNode('non-existent-node');
  
  // Original node should still exist
  const nodes = hash.getAllNodes();
  t.is(nodes.length, 1);
  t.is(nodes[0].id, 'node-1');
});

test('should handle duplicate node additions', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    weight: 1,
    isHealthy: true
  };
  
  // Add same node multiple times
  hash.addNode(node1);
  hash.addNode(node1);
  hash.addNode({ ...node1 }); // Same ID, different object
  
  // Should only have one instance
  const nodes = hash.getAllNodes();
  t.is(nodes.length, 1);
  t.is(nodes[0].id, 'node-1');
});

test('should handle extreme weight values', t => {
  const hash = new ConsistentHash();
  
  const zeroWeightNode: Node = {
    id: 'zero-weight',
    address: '127.0.0.1',
    port: 8000,
    weight: 0,
    isHealthy: true
  };
  
  const highWeightNode: Node = {
    id: 'high-weight',
    address: '127.0.0.1',
    port: 8001,
    weight: 1000,
    isHealthy: true
  };
  
  hash.addNode(zeroWeightNode);
  hash.addNode(highWeightNode);
  
  // Test distribution with extreme weights
  const documentCount = 100;
  const distribution = new Map<string, number>();
  
  for (let i = 0; i < documentCount; i++) {
    const node = hash.getNode(`document-${i}`);
    if (node) {
      distribution.set(node.id, (distribution.get(node.id) || 0) + 1);
    }
  }
  
  // High weight node should get almost all documents
  const zeroWeightCount = distribution.get('zero-weight') || 0;
  const highWeightCount = distribution.get('high-weight') || 0;
  
  t.true(highWeightCount > zeroWeightCount);
});

test('should handle negative weight values', t => {
  const hash = new ConsistentHash();
  
  const negativeWeightNode: Node = {
    id: 'negative-weight',
    address: '127.0.0.1',
    port: 8000,
    weight: -5,
    isHealthy: true
  };
  
  // Should handle negative weights gracefully
  hash.addNode(negativeWeightNode);
  
  const nodes = hash.getAllNodes();
  t.is(nodes.length, 1);
  
  // With negative weight, node gets 0 virtual nodes, so routing returns null
  const node = hash.getNode('test-document');
  t.is(node, null); // Expected behavior for negative weight
});

test('should handle very long document IDs', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    isHealthy: true
  };
  
  hash.addNode(node1);
  
  // Very long document ID (1KB)
  const longDocumentId = 'a'.repeat(1024);
  
  const node = hash.getNode(longDocumentId);
  t.truthy(node);
  t.is(node!.id, 'node-1');
  
  // Consistency check
  const nodeAgain = hash.getNode(longDocumentId);
  t.is(node!.id, nodeAgain!.id);
});

test('should handle special characters in document IDs', t => {
  const hash = new ConsistentHash();
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    isHealthy: true
  };
  
  hash.addNode(node1);
  
  // Test various special characters and encodings
  const specialDocuments = [
    'document-with-spaces and symbols!@#$%^&*()',
    'document/with/slashes',
    'document-with-unicode-🚀-emoji',
    'document.with.dots',
    'document_with_underscores',
    'document-with-dashes',
    '文档中文名称',
    'документ-на-русском',
    ''
  ];
  
  for (const docId of specialDocuments) {
    const node = hash.getNode(docId);
    if (docId.length > 0) {
      t.truthy(node, `Failed for document ID: ${docId}`);
      t.is(node!.id, 'node-1');
    }
  }
});

test('should handle rapid node additions and removals', t => {
  const hash = new ConsistentHash();
  
  // Rapid operations
  for (let i = 0; i < 100; i++) {
    const node: Node = {
      id: `rapid-node-${i}`,
      address: '127.0.0.1',
      port: 8000 + i,
      isHealthy: true
    };
    
    hash.addNode(node);
    
    // Remove every other node immediately
    if (i % 2 === 1) {
      hash.removeNode(`rapid-node-${i - 1}`);
    }
  }
  
  const nodes = hash.getAllNodes();
  t.is(nodes.length, 50); // Should have 50 nodes remaining
  
  // Should still be able to route documents
  const node = hash.getNode('test-document');
  t.truthy(node);
});

test('should maintain consistency during concurrent health status changes', t => {
  const hash = new ConsistentHash();
  
  const nodes: Node[] = [];
  for (let i = 0; i < 10; i++) {
    const node: Node = {
      id: `node-${i}`,
      address: '127.0.0.1',
      port: 8000 + i,
      isHealthy: true
    };
    nodes.push(node);
    hash.addNode(node);
  }
  
  // Rapid health status changes
  for (let i = 0; i < 100; i++) {
    const nodeId = `node-${i % 10}`;
    if (i % 2 === 0) {
      hash.markNodeUnhealthy(nodeId);
    } else {
      hash.markNodeHealthy(nodeId);
    }
  }
  
  // Should still function properly
  const healthyNodes = hash.getHealthyNodes();
  t.true(healthyNodes.length >= 0);
  t.true(healthyNodes.length <= 10);
  
  // Should be able to route documents
  const node = hash.getNode('consistency-test');
  if (healthyNodes.length > 0) {
    t.truthy(node);
  }
});

test('should handle large number of virtual nodes', t => {
  const hash = new ConsistentHash(1000); // High virtual node count
  
  const node1: Node = {
    id: 'node-1',
    address: '127.0.0.1',
    port: 8000,
    weight: 1,
    isHealthy: true
  };
  
  const node2: Node = {
    id: 'node-2',
    address: '127.0.0.1',
    port: 8001,
    weight: 1,
    isHealthy: true
  };
  
  hash.addNode(node1);
  hash.addNode(node2);
  
  // Should still distribute evenly with high virtual node count
  const documentCount = 1000;
  const distribution = new Map<string, number>();
  
  for (let i = 0; i < documentCount; i++) {
    const node = hash.getNode(`document-${i}`);
    if (node) {
      distribution.set(node.id, (distribution.get(node.id) || 0) + 1);
    }
  }
  
  const node1Count = distribution.get('node-1') || 0;
  const node2Count = distribution.get('node-2') || 0;
  
  // Should be relatively balanced (within 20% difference)
  const diff = Math.abs(node1Count - node2Count);
  const average = (node1Count + node2Count) / 2;
  const diffPercentage = (diff / average) * 100;
  
  t.true(diffPercentage < 20);
});

test('should handle node health recovery scenarios', t => {
  const hash = new ConsistentHash();
  
  const nodes: Node[] = [
    { id: 'node-1', address: '127.0.0.1', port: 8000, isHealthy: true },
    { id: 'node-2', address: '127.0.0.1', port: 8001, isHealthy: true },
    { id: 'node-3', address: '127.0.0.1', port: 8002, isHealthy: true }
  ];
  
  nodes.forEach(node => hash.addNode(node));
  
  const documentId = 'recovery-test-document';
  
  // Initial routing
  const initialNode = hash.getNode(documentId);
  t.truthy(initialNode);
  
  // Mark all nodes except one as unhealthy
  hash.markNodeUnhealthy('node-1');
  hash.markNodeUnhealthy('node-2');
  
  const failoverNode = hash.getNode(documentId);
  t.truthy(failoverNode);
  t.is(failoverNode!.id, 'node-3');
  
  // Recover nodes
  hash.markNodeHealthy('node-1');
  hash.markNodeHealthy('node-2');
  
  // Should route back to original node or maintain consistency
  const recoveredNode = hash.getNode(documentId);
  t.truthy(recoveredNode);
  
  // Multiple calls should return same node
  const consistencyCheck = hash.getNode(documentId);
  t.is(recoveredNode!.id, consistencyCheck!.id);
});