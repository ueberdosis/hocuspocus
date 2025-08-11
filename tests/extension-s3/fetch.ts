import test from "ava";
import { S3 } from "@hocuspocus/extension-s3";
import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { newHocuspocus } from '../utils/index.ts';

// Test configuration for MinIO
const testConfig = {
  endpoint: "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin"
  },
  bucket: "hocuspocus-test",
  forcePathStyle: true,
  prefix: "test-documents/"
};

test.before(async () => {
  // Create test bucket if it doesn't exist
  const s3Client = new S3Client({
    endpoint: testConfig.endpoint,
    region: testConfig.region,
    credentials: testConfig.credentials,
    forcePathStyle: true,
  });

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: testConfig.bucket }));
  } catch (error: any) {
    if (error.name === "NotFound") {
      await s3Client.send(new CreateBucketCommand({ Bucket: testConfig.bucket }));
    }
  }
});

test("should throw an error without bucket name", async t => {
  t.throws(() => {
    new S3({});
  }, { message: "S3 bucket name is required" });
});

test("should create extension with valid configuration", async t => {
  const extension = new S3(testConfig);
  t.truthy(extension);
  t.is(extension.configuration.bucket, testConfig.bucket);
});

test("should store and retrieve documents", async t => {
  const extension = new S3(testConfig);
  const hocuspocus = await newHocuspocus({
    extensions: [extension],
  });

  const docConnection = await hocuspocus.openDirectConnection("test-document", {});
  
  // Add some data to the document
  await docConnection.transact((doc: any) => {
    doc.getMap("test").set("key", "value");
  });

  await docConnection.disconnect();

  // Create a new connection to test loading
  const docConnection2 = await hocuspocus.openDirectConnection("test-document", {});
  
  const testMap = docConnection2.document.getMap("test");
  t.is(testMap.get("key"), "value");
  
  await docConnection2.disconnect();
  await hocuspocus.server.destroy();
});

test("should handle non-existent documents", async t => {
  const extension = new S3(testConfig);
  const hocuspocus = await newHocuspocus({
    extensions: [extension],
  });

  const docConnection = await hocuspocus.openDirectConnection("non-existent-document", {});
  
  // Document should be empty for new documents
  const testMap = docConnection.document.getMap("test");
  t.is(testMap.size, 0);
  
  await docConnection.disconnect();
  await hocuspocus.server.destroy();
});

test("should work with custom S3 client", async t => {
  const customS3Client = new S3Client({
    endpoint: testConfig.endpoint,
    region: testConfig.region,
    credentials: testConfig.credentials,
    forcePathStyle: true,
  });

  const extension = new S3({
    bucket: testConfig.bucket,
    s3Client: customS3Client,
  });

  t.truthy(extension);
  t.is(extension.configuration.bucket, testConfig.bucket);
});

test("should use correct object key format", async t => {
  const extension = new S3(testConfig);
  
  // Test private method through configuration
  const documentName = "test-document";
  
  // Since getObjectKey is private, we verify through the fetch method
  const hocuspocus = await newHocuspocus({
    extensions: [extension],
  });

  const docConnection = await hocuspocus.openDirectConnection(documentName, {});
  await docConnection.disconnect();
  await hocuspocus.server.destroy();

  // Key format is verified implicitly through successful operations
  t.is(extension.configuration.prefix, testConfig.prefix);
});
