import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { S3 } from '@hocuspocus/extension-s3'

// Basic AWS S3 example
const server = new Server({
  port: 8001,
  name: 's3-aws',
  extensions: [
    new Logger(),
    new S3({
      bucket: process.env.S3_BUCKET || 'my-hocuspocus-documents',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : undefined
    }),
  ],
})

server.listen()

// MinIO S3-compatible example (Main development server)
const minioServer = new Server({
  port: 8000,
  name: 's3-minio',
  extensions: [
    new Logger(),
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

minioServer.listen()

// AWS S3 with IAM roles (no credentials needed when running on EC2/Lambda)
// Falls back to environment variables for local development
const iamServer = new Server({
  port: 8002,
  name: 's3-iam',
  extensions: [
    new Logger(),
    new S3({
      bucket: process.env.S3_BUCKET || 'my-hocuspocus-documents',
      region: process.env.S3_REGION || 'us-east-1',
      prefix: process.env.S3_PREFIX || 'collaborative-docs/',
      // Use credentials from environment variables for local development
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : undefined
    }),
  ],
})

iamServer.listen()

// DigitalOcean Spaces example
const spacesServer = new Server({
  port: 8003,
  name: 's3-spaces',
  extensions: [
    new Logger(),
    new S3({
      bucket: process.env.S3_BUCKET || 'my-spaces-bucket',
      region: process.env.S3_REGION || 'nyc3',
      endpoint: process.env.S3_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
      credentials: {
        accessKeyId: process.env.SPACES_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID || 'your-spaces-key',
        secretAccessKey: process.env.SPACES_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'your-spaces-secret'
      }
    }),
  ],
})

spacesServer.listen()

console.log(`
🚀 S3 Extension Examples Started:

  MinIO (Main):     http://localhost:8000
  AWS S3:           http://localhost:8001
  IAM Roles:        http://localhost:8002
  DigitalOcean:     http://localhost:8003

📝 Environment Variables:
  S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_PREFIX
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
  SPACES_ACCESS_KEY, SPACES_SECRET_KEY

🐳 For local development with MinIO:
  ./start-dev.sh

💡 Documents are stored as: {prefix}{documentName}.bin
`)
