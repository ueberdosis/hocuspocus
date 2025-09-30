# @hocuspocus/extension-s3

A S3-compatible persistence driver for Hocuspocus that stores Y.js documents in Amazon S3 or S3-compatible storage services like MinIO, DigitalOcean Spaces, etc.

## Installation

```bash
npm install @hocuspocus/extension-s3
```

## Quick Start

### Basic AWS S3 Configuration

```javascript
import { Server } from '@hocuspocus/server'
import { S3 } from '@hocuspocus/extension-s3'

const server = new Server({
  extensions: [
    new S3({
      bucket: 'my-documents-bucket',
      region: 'us-east-1',
      credentials: {
        accessKeyId: 'your-access-key',
        secretAccessKey: 'your-secret-key'
      }
    }),
  ],
})

server.listen()
```

### MinIO Configuration

For local development with MinIO, ensure you set `forcePathStyle: true`:

```javascript
const server = new Server({
  extensions: [
    new S3({
      bucket: 'hocuspocus-documents',
      endpoint: 'http://localhost:9000',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin'
      }
    }),
  ],
})
```

## Configuration Options

- **bucket** (required): S3 bucket name where documents will be stored
- **region**: AWS region (default: 'us-east-1')
- **prefix**: Key prefix for documents (default: 'hocuspocus-documents/')
- **credentials**: AWS credentials object with accessKeyId and secretAccessKey
- **endpoint**: S3 endpoint URL (for S3-compatible services)
- **forcePathStyle**: Use path-style URLs (required for MinIO, default: false)
- **s3Client**: Custom S3Client instance

## Document Storage

Documents are stored as binary files in S3 with the naming convention:
`{prefix}{documentName}.bin`

## Scaling with Redis

For horizontal scaling, combine S3 with the Redis extension. Redis handles real-time synchronization while S3 provides persistent storage.

```javascript
import { Server } from '@hocuspocus/server'
import { Logger } from '@hocuspocus/extension-logger'
import { Redis } from '@hocuspocus/extension-redis'
import { S3 } from '@hocuspocus/extension-s3'

// Server 1
const server1 = new Server({
  name: "server-1",
  port: 8001,
  extensions: [
    new Logger(),
    new Redis({
      host: "127.0.0.1",
      port: 6379,
    }),
    new S3({
      bucket: 'hocuspocus-documents',
      endpoint: 'http://localhost:9000', // MinIO
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin'
      }
    }),
  ],
})

// Server 2 - same configuration with different name/port
const server2 = new Server({
  name: "server-2", 
  port: 8002,
  extensions: [/* same extensions */],
})

server1.listen()
server2.listen()
```

## CLI Usage

You can also use the S3 extension with the Hocuspocus CLI:

```bash
# Basic usage
hocuspocus --s3 --s3-bucket my-documents

# MinIO setup (forcePathStyle automatically enabled)
hocuspocus --s3 --s3-bucket hocuspocus-documents --s3-endpoint http://localhost:9000
```

## Development

### Quick Start

For local development with MinIO (S3-compatible storage):

```bash
# Set up development environment
npm run dev:setup

# Test S3 configuration  
npm run dev:test-s3

# Run S3 playground examples
npm run playground:s3
```

## Complete Documentation

For detailed documentation, examples, best practices, and troubleshooting, see:
[📚 S3 Extension Documentation](https://tiptap.dev/docs/hocuspocus/server/extensions/s3)

## IAM Permissions

Your AWS credentials or IAM role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:HeadObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow", 
      "Action": ["s3:HeadBucket"],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```