import { Server } from '@hocuspocus/server';
import { Logger } from '@hocuspocus/extension-logger';
import { Redis } from '@hocuspocus/extension-redis';
import { SmartRoute } from '@hocuspocus/extension-smartroute';

/**
 * Basic SmartRoute example
 * Demonstrates SmartRoute configuration in single-node scenario
 */

const server = new Server({
  port: Number.parseInt(process.env.PORT || '8000'),
  
  extensions: [
    // Logger extension
    new Logger(),
    
    // SmartRoute extension (highest priority)
    new SmartRoute({
      nodeId: 'node-1',
      nodeAddress: '127.0.0.1',
      nodePort: 8000,
      nodeWeight: 1,
      // Disable enforce routing in single-node environment
      enforceRouting: false,
    }),
    
    // Redis extension for state synchronization
    new Redis({
      port: Number.parseInt(process.env.REDIS_PORT || '6379'),
      host: process.env.REDIS_HOST || '127.0.0.1',
    }),
  ],

  async onConnect(data) {
    console.log(`✅ Client connected to document: ${data.documentName}`);
    return {};
  },

  async onDisconnect(data) {
    console.log(`❌ Client disconnected from document: ${data.documentName}`);
  },
});

server.listen(8000, () => {
  console.log('🚀 Hocuspocus server with SmartRoute extension started');
  console.log(`📍 Available at: http://127.0.0.1:8000`);
});