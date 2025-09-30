import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'
import { S3 } from '@hocuspocus/extension-s3'

// AWS S3 + Redis scaling example (only if AWS credentials are available)
let awsServer1, awsServer2;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsServer1 = new Server({
    port: 8001,
    name: 's3-redis-aws-1',
    extensions: [
      new Logger(),
      new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
      }),
      new S3({
        bucket: process.env.S3_BUCKET || 'my-hocuspocus-documents',
        region: process.env.S3_REGION || 'us-east-1',
        prefix: process.env.S3_PREFIX || 'collaborative-docs/',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      }),
    ],
  })

  // Second AWS S3 + Redis server instance
  awsServer2 = new Server({
    port: 8002,
    name: 's3-redis-aws-2',
    extensions: [
      new Logger(),
      new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
      }),
      new S3({
        bucket: process.env.S3_BUCKET || 'my-hocuspocus-documents',
        region: process.env.S3_REGION || 'us-east-1',
        prefix: process.env.S3_PREFIX || 'collaborative-docs/',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      }),
    ],
  })
}

// MinIO + Redis local development example
const minioServer1 = new Server({
  port: 8000,
  name: 's3-redis-minio-1',
  extensions: [
    new Logger(),
    new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
    }),
    new S3({
      bucket: process.env.S3_BUCKET || 'hocuspocus-documents',
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
      }
    }),
  ],
})

const minioServer2 = new Server({
  port: 8003,
  name: 's3-redis-minio-2',
  extensions: [
    new Logger(),
    new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
    }),
    new S3({
      bucket: process.env.S3_BUCKET || 'hocuspocus-documents',
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'minioadmin'
      }
    }),
  ],
})

// Start server instances
if (awsServer1 && awsServer2) {
  awsServer1.listen()
  awsServer2.listen()
}
minioServer1.listen()
minioServer2.listen()

const awsStatus = (awsServer1 && awsServer2) ? `
  AWS S3 Instances:
    Server 1:         http://localhost:8001
    Server 2:         http://localhost:8002` : `
  AWS S3 Instances:   [Skipped - no AWS credentials found]`

console.log(`
🚀 S3 + Redis Scaling Examples Started:
${awsStatus}

  MinIO Instances:
    Server 1:         http://localhost:8000
    Server 2:         http://localhost:8003

📝 Environment Variables:
  REDIS_HOST, REDIS_PORT
  S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_PREFIX
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

🔄 Redis handles real-time sync between instances
💾 S3/MinIO provides persistent document storage

🐳 For local development with Redis + MinIO:
  docker-compose up redis minio

💡 Documents are stored as: {prefix}{documentName}.bin
🔗 All server instances share the same Redis and S3 backend
`)
