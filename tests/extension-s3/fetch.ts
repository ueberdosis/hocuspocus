// @ts-nocheck - AWS SDK types resolved through extension package
import test from "ava";
import sinon from "sinon";
import { S3 } from "@hocuspocus/extension-s3";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { ReadableStream } from "stream/web";
import * as Y from 'yjs'

const testConfig = {
  bucket: "hocuspocus-test",
  prefix: "test-documents/",
};

const storage = new Map<string, Buffer>();
const sandbox = sinon.createSandbox();
// Create a single dummy client to be used in all tests
const dummyS3Client = new S3Client({});

test.beforeEach(() => {
  sandbox.restore();
  storage.clear();

  sandbox.stub(S3Client.prototype, "send").callsFake(async (command: any) => {
    if (command instanceof HeadBucketCommand || command instanceof HeadObjectCommand) {
      return Promise.resolve();
    }
    if (command instanceof CreateBucketCommand) {
      return Promise.resolve();
    }
    if (command instanceof GetObjectCommand) {
      const key = command.input.Key as string; // 确保 key 是 string 类型
      if (storage.has(key)) {
        const buffer = storage.get(key)!;
        return {
          Body: {
            // Mimic AWS SDK v3 GetObjectCommand Body interface used in the extension
            transformToWebStream: () =>
              new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(new Uint8Array(buffer));
                  controller.close();
                },
              }),
          },
        };
      }
      const err = new Error("NoSuchKey");
      err.name = "NoSuchKey";
      // @ts-ignore
      err.$metadata = { httpStatusCode: 404 };
      throw err;
    }
    if (command instanceof PutObjectCommand) {
      const key = command.input.Key as string; // 确保 key 是 string 类型
      const body = command.input.Body;
      if (body instanceof Buffer) {
        storage.set(key, body);
      } else {
        throw new Error("Body must be a Buffer");
      }
      return Promise.resolve();
    }
  });
});

test.afterEach.always(() => {
  sandbox.restore();
  storage.clear();
});

test("should throw an error without bucket name", async (t) => {
  t.throws(
    () => {
      new S3({});
    },
    { message: "S3 bucket name is required" }
  );
});

test("should create extension with valid configuration", async (t) => {
  const extension = new S3({ ...testConfig, s3Client: dummyS3Client });
  t.truthy(extension);
  t.is(extension.configuration.bucket, testConfig.bucket);
});

test("should store and retrieve documents", async (t) => {
  const extension = new S3({ ...testConfig, s3Client: dummyS3Client });
  await (extension as any).onConfigure();

  const documentName = "test-document";

  const doc = new Y.Doc();
  doc.getMap('test').set('key', 'value');

  await extension.configuration.store({
    documentName,
    state: Buffer.from(Y.encodeStateAsUpdate(doc)),
  } as any);

  const fetched = await extension.configuration.fetch({ documentName } as any);
  t.truthy(fetched);
  t.true(fetched instanceof Uint8Array);
  t.true((fetched as Uint8Array).length > 0);

  const doc2 = new Y.Doc();
  Y.applyUpdate(doc2, fetched!);
  t.is(doc2.getMap('test').get('key'), 'value');
});

test("should handle non-existent documents", async (t) => {
  const extension = new S3({ ...testConfig, s3Client: dummyS3Client });
  await (extension as any).onConfigure();

  const result = await extension.configuration.fetch({
    documentName: "non-existent-document",
  } as any);

  t.is(result, null);
});

test("should work with custom S3 client", async (t) => {
  const extension = new S3({
    bucket: testConfig.bucket,
    s3Client: dummyS3Client,
  });

  t.truthy(extension);
  t.is(extension.configuration.bucket, testConfig.bucket);
});

test("should use correct object key format", async (t) => {
  const documentName = "test-document-key-format";
  const extension = new S3({ ...testConfig, s3Client: dummyS3Client });
  await (extension as any).onConfigure();

  const doc = new Y.Doc();
  doc.getMap('test').set('key', 'value');

  await extension.configuration.store({
    documentName,
    state: Buffer.from(Y.encodeStateAsUpdate(doc)),
  } as any);

  const expectedKey = `${testConfig.prefix}${documentName}.bin`;
  t.true(storage.has(expectedKey), `Storage should have key: ${expectedKey}`);
});
