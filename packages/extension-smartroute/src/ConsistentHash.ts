import { createHash } from 'node:crypto';

export interface Node {
  id: string;
  address: string;
  port: number;
  weight?: number;
  isHealthy: boolean;
  lastHealthCheck?: number;
}

/**
 * Consistent hash ring implementation
 * Supports virtual nodes, node weights, and dynamic scaling
 */
export class ConsistentHash {
  private ring: Map<number, Node> = new Map();
  private nodes: Map<string, Node> = new Map();
  private virtualNodeCount: number;
  private sortedHashes: number[] = [];

  constructor(virtualNodeCount = 150) {
    this.virtualNodeCount = virtualNodeCount;
  }

  /**
   * Calculate hash value for a string
   */
  private hash(key: string): number {
    return Number.parseInt(createHash('md5').update(key).digest('hex').substring(0, 8), 16);
  }

  /**
   * Add node to the hash ring
   */
  addNode(node: Node): void {
    if (this.nodes.has(node.id)) {
      this.removeNode(node.id);
    }

    this.nodes.set(node.id, node);
    const weight = node.weight || 1;
    const virtualNodes = Math.floor(this.virtualNodeCount * weight);

    // Create virtual nodes for the physical node
    for (let i = 0; i < virtualNodes; i++) {
      const virtualKey = `${node.id}:${i}`;
      const hashValue = this.hash(virtualKey);
      this.ring.set(hashValue, node);
    }

    this.updateSortedHashes();
  }

  /**
   * Remove node from the hash ring
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.delete(nodeId);
    
    // Remove all virtual nodes for this physical node
    const toRemove: number[] = [];
    for (const [hash, ringNode] of this.ring) {
      if (ringNode.id === nodeId) {
        toRemove.push(hash);
      }
    }

    for (const hash of toRemove) {
      this.ring.delete(hash);
    }
    this.updateSortedHashes();
  }

  /**
   * Update sorted hash values array
   */
  private updateSortedHashes(): void {
    this.sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  /**
   * Get node for document ID
   */
  getNode(documentId: string): Node | null {
    if (this.sortedHashes.length === 0) {
      return null;
    }

    const hash = this.hash(documentId);
    
    // Find first node with hash >= target hash
    let targetHash = this.sortedHashes.find(h => h >= hash);
    
    // If not found, use first node in ring (circular structure)
    if (targetHash === undefined) {
      targetHash = this.sortedHashes[0];
    }

    const node = this.ring.get(targetHash);
    return node?.isHealthy ? node : this.getHealthyNode(documentId);
  }

  /**
   * Get healthy node (fallback mechanism)
   */
  private getHealthyNode(documentId: string): Node | null {
    const healthyNodes = Array.from(this.nodes.values()).filter(n => n.isHealthy);
    if (healthyNodes.length === 0) {
      return null;
    }

    // If no healthy nodes at hash position, use simple hash to select healthy node
    const hash = this.hash(documentId);
    const index = hash % healthyNodes.length;
    return healthyNodes[index];
  }

  /**
   * Mark node as unhealthy
   */
  markNodeUnhealthy(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isHealthy = false;
      node.lastHealthCheck = Date.now();
    }
  }

  /**
   * Mark node as healthy
   */
  markNodeHealthy(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isHealthy = true;
      node.lastHealthCheck = Date.now();
    }
  }

  /**
   * Get all nodes
   */
  getAllNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get healthy nodes
   */
  getHealthyNodes(): Node[] {
    return Array.from(this.nodes.values()).filter(n => n.isHealthy);
  }

  /**
   * Get node information
   */
  getNodeInfo(nodeId: string): Node | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Calculate document migration impact (for scaling analysis)
   */
  calculateMigrationImpact(newNodes: Node[]): { 
    affected: string[]; 
    migrations: Array<{ from: string; to: string }> 
  } {
    // Can implement more complex migration analysis logic here
    const affected: string[] = [];
    const migrations: Array<{ from: string; to: string }> = [];
    
    // Simplified implementation, can be extended as needed
    return { affected, migrations };
  }
}