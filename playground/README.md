# Hocuspocus Playground

```
Hi!

Welcome to the playground. This is mainly meant for internal usage during Hocuspocus development,
but feel free to fiddle around here and find a few examples of how things can work.

Please note that there are different packages used in frontend / backend folders, so you should
run `npm install` in both if you get any errors.

The playground is importing @hocuspocus packages from the packages folder, so you need to build them first.
Run `npm run build:packages` in the repo root to do that.
If you want changes inside the packages folder to compile live, you can use rollup: `rollup -c -w`.

(see also docs/contributing.md)

You can run `npm run playground` in the repository root, which will spin up a development server on
http://127.0.0.1:3000.

## S3 Extension Development

For S3 extension development, use the new integrated development scripts:

```bash
# Set up development environment (creates .env, starts Docker services)
npm run dev:setup

# Test S3 configuration
npm run dev:test-s3

# Run S3 playground examples
npm run playground:s3      # S3 examples on ports 8000-8003
npm run playground:s3-redis # S3 + Redis scaling examples
```

The development environment includes:
- MinIO (S3-compatible): http://localhost:9000 (API) / http://localhost:9001 (Console)
- Redis: localhost:6379
- Default credentials: minioadmin / minioadmin

## Available Playground Examples

- `npm run playground:default` - Basic server example
- `npm run playground:express` - Express.js integration
- `npm run playground:koa` - Koa.js integration
- `npm run playground:redis` - Redis extension example
- `npm run playground:s3` - S3 extension examples
- `npm run playground:s3-redis` - S3 + Redis scaling
- `npm run playground:webhook` - Webhook extension example

If you have any questions, feel free to join our discord or ask on Github (links can be found in the
repo README.md one folder up).
```
