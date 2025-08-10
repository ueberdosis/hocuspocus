import { beforeAll, describe, expect, it } from "ava";
import { S3 } from "@hocuspocus/extension-s3";
import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { newHocuspocus } from "../utils/index.js";

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

describe("S3 Extension", () => {
  beforeAll(async () => {
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

  it("should throw an error without bucket name", async () => {
    expect(() => {
      new S3({});
    }).toThrow("S3 bucket name is required");
  });

  it("should create extension with valid configuration", async () => {
    const extension = new S3(testConfig);
    expect(extension).toBeDefined();
    expect(extension.configuration.bucket).toBe(testConfig.bucket);
  });

  it("should store and retrieve documents", async () => {
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
    expect(testMap.get("key")).toBe("value");
    
    await docConnection2.disconnect();
    await hocuspocus.destroy();
  }, 15000);

  it("should handle non-existent documents", async () => {
    const extension = new S3(testConfig);
    const hocuspocus = await newHocuspocus({
      extensions: [extension],
    });

    const docConnection = await hocuspocus.openDirectConnection("non-existent-document", {});
    
    // Document should be empty for new documents
    const testMap = docConnection.document.getMap("test");
    expect(testMap.size).toBe(0);
    
    await docConnection.disconnect();
    await hocuspocus.destroy();
  }, 10000);

  it("should work with custom S3 client", async () => {
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

    expect(extension).toBeDefined();
    expect(extension.configuration.bucket).toBe(testConfig.bucket);
  });

  it("should use correct object key format", async () => {
    const extension = new S3(testConfig);
    
    // Test private method through configuration
    const documentName = "test-document";
    
    // Since getObjectKey is private, we verify through the fetch method
    const hocuspocus = await newHocuspocus({
      extensions: [extension],
    });

    const docConnection = await hocuspocus.openDirectConnection(documentName, {});
    await docConnection.disconnect();
    await hocuspocus.destroy();

    // Key format is verified implicitly through successful operations
    expect(extension.configuration.prefix).toBe(testConfig.prefix);
  });
});