# Hocuspocus
A plug & play collaboration backend based on [Y.js](https://github.com/yjs/yjs).

[![Build Status](https://github.com/ueberdosis/hocuspocus/workflows/build/badge.svg)](https://github.com/ueberdosis/hocuspocus/actions)
[![Version](https://img.shields.io/npm/v/@hocuspocus/server.svg?label=version)](https://www.npmjs.com/package/@hocuspocus/server)
[![Downloads](https://img.shields.io/npm/dm/@hocuspocus/server.svg)](https://npmcharts.com/compare/@hocuspocus/server?minimal=true)
[![License](https://img.shields.io/npm/l/@hocuspocus/server.svg)](https://www.npmjs.com/package/@hocuspocus/server)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?sanitize=true)](https://discord.gg/WtJ49jGshW)
[![Sponsor](https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub)](https://github.com/sponsors/ueberdosis)

## Documentation
The full documentation is a available on [hocuspocus.dev/introduction](https://tiptap.dev/docs/hocuspocus/introduction).

## Cloud Hosting

You want to use Hocuspocus, but don't want to care about hosting? Check our [Cloud Offering: Tiptap Collab](https://tiptap.dev/collab)


## Feedback
Send all your questions, feedback and bug reports to [humans@tiptap.dev](mailto:humans@tiptap.dev) or [create an issue](https://github.com/ueberdosis/hocuspocus/issues/new/choose) here.

## Usage
The following example is a example setup you need to start a WebSocket server. By default, it’s listening on [http://127.0.0.1](http://127.0.0.1) (or prefixed with the WebSocket protocol on ws://127.0.0.1):

```js
import { Server } from '@hocuspocus/server'
import { SQLite } from '@hocuspocus/extension-sqlite'

const server = new Server({
  port: 8000,

  async onConnect() {
    console.log('🔮')
  },

  extensions: [
    new SQLite({
      database: 'db.sqlite',
    }),
  ],
});

server.listen();
```

## Development

### Quick Start with S3 Extension

To quickly set up a development environment with S3 persistence:

```bash
# Set up development environment (Docker services + .env file)
npm run dev:setup

# Test S3 configuration
npm run dev:test-s3

# Start S3 playground
npm run playground:s3
```

### Available Development Scripts

```bash
# Environment setup
npm run dev:setup         # Complete setup (.env + Docker services)
npm run dev:env           # Create .env file from template
npm run dev:services      # Start Docker services (Redis + MinIO)
npm run dev:services:down # Stop Docker services  
npm run dev:services:reset # Reset services and data

# S3 testing
npm run dev:test-s3        # Test complete S3 configuration
npm run dev:test-s3:minio  # Test MinIO connection only
npm run dev:test-s3:nodejs # Test Node.js S3 client only

# Playground examples
npm run playground:s3      # S3 extension examples
npm run playground:s3-redis # S3 + Redis scaling examples
```

## Community
For help, discussion about best practices, or any other conversation:

[Join the Tiptap Discord Server](https://discord.gg/WtJ49jGshW)

## Sponsors 💖
<table>
  <tr>
    <td align="center">
      <a href="https://tiptap.dev/">
        <img src="https://unavatar.io/github/ueberdosis" width="100"><br>
        <strong>Tiptap</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://cargo.site/">
        <img src="https://unavatar.io/github/cargo" width="100"><br>
        <strong>Cargo</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://saga.so/">
        <img src="https://unavatar.io/saga.so" width="100"><br>
        <strong>Saga</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://www.gamma.app/">
        <img src="https://unavatar.io/gamma.app" width="100"><br>
        <strong>Gamma</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://www.getoutline.com/">
        <img src="https://unavatar.io/github/outline" width="100"><br>
        <strong>Outline</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://ahrefs.com/">
        <img src="https://unavatar.io/ahrefs.com" width="100"><br>
        <strong>Ahrefs</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/brickdoc">
        <img src="https://unavatar.io/github/brickdoc" width="100"><br>
        <strong>Brickdoc</strong>
      </a>
    </td>
    <td align="center">
      <a href="https://www.sanalabs.com/">
        <img src="https://unavatar.io/github/sanalabs" width="100"><br>
        <strong>Sana</strong>
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://poggio.io">
        <img src="https://unavatar.io/github/poggiolabs" width="100"><br>
        <strong>Poggio</strong>
      </a>
    </td>
  </tr>
</table>

… and hundreds of awesome inviduals.

Using Hocuspocus in production? Invest in the future of Hocuspocus and [become a sponsor!](https://github.com/sponsors/ueberdosis)

## Development Environment

For local development and testing, we provide a Docker Compose setup with Redis and MinIO (S3-compatible storage):

```bash
# Start development services
./start-dev.sh

# Test S3/MinIO configuration
./test-s3.sh

# Start Hocuspocus with S3 extension
cd packages/cli
node src/index.js --s3 --s3-bucket hocuspocus-documents --s3-endpoint http://localhost:9000
```

### Available Services

- **Redis**: `localhost:6379`
- **MinIO API**: `http://localhost:9000`
- **MinIO Console**: `http://localhost:9001` (minioadmin/minioadmin)

### Environment Configuration

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

## Contributing
Please see [CONTRIBUTING](docs/contributing.md) for details.

## Contributors
[kris](https://github.com/kriskbx) (who wrote the initial version), [Tom Moor](https://github.com/tommoor), [YousefED (@TypeCellOS)](https://github.com/YousefED) and [many more](../../contributors).

## License
The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
