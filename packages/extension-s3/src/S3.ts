import type { DatabaseConfiguration } from "@hocuspocus/extension-database";
import { Database } from "@hocuspocus/extension-database";
import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
	HeadObjectCommand,
} from "@aws-sdk/client-s3";
import kleur from "kleur";

export interface S3Configuration extends DatabaseConfiguration {
	/**
	 * AWS S3 region
	 */
	region?: string;
	/**
	 * S3 bucket name
	 */
	bucket: string;
	/**
	 * S3 key prefix for documents (optional)
	 */
	prefix?: string;
	/**
	 * AWS credentials
	 */
	credentials?: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	/**
	 * S3 endpoint URL (for S3-compatible services like MinIO)
	 */
	endpoint?: string;
	/**
	 * Force path style URLs (required for MinIO)
	 */
	forcePathStyle?: boolean;
	/**
	 * Custom S3 client
	 */
	s3Client?: S3Client;
}

export class S3 extends Database {
	private s3Client?: S3Client;

	configuration: S3Configuration = {
		region: "us-east-1",
		bucket: "",
		prefix: "hocuspocus-documents/",
		forcePathStyle: false,
		fetch: async ({ documentName }) => {
			const key = this.getObjectKey(documentName);

			try {
				const command = new GetObjectCommand({
					Bucket: this.configuration.bucket,
					Key: key,
				});

				const response = await this.s3Client!.send(command);

				if (response.Body) {
					// Convert stream to Uint8Array
					const chunks: Uint8Array[] = [];
					const reader = response.Body.transformToWebStream().getReader();

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						chunks.push(value);
					}

					// Combine all chunks into a single Uint8Array
					const totalLength = chunks.reduce(
						(acc, chunk) => acc + chunk.length,
						0,
					);
					const result = new Uint8Array(totalLength);
					let offset = 0;

					for (const chunk of chunks) {
						result.set(chunk, offset);
						offset += chunk.length;
					}

					return result;
				}

				return null;
			} catch (error: any) {
				if (
					error.name === "NoSuchKey" ||
					error.$metadata?.httpStatusCode === 404
				) {
					// Document doesn't exist yet, return null
					return null;
				}
				throw error;
			}
		},
		store: async ({ documentName, state }) => {
			const key = this.getObjectKey(documentName);

			const command = new PutObjectCommand({
				Bucket: this.configuration.bucket,
				Key: key,
				Body: state,
				ContentType: "application/octet-stream",
			});

			await this.s3Client!.send(command);
		},
	};

	constructor(configuration: Partial<S3Configuration>) {
		super({});

		this.configuration = {
			...this.configuration,
			...configuration,
		};

		// Validate required configuration
		if (!this.configuration.bucket) {
			throw new Error("S3 bucket name is required");
		}
	}

	private getObjectKey(documentName: string): string {
		const prefix = this.configuration.prefix || "";
		return `${prefix}${documentName}.bin`;
	}

	async onConfigure() {
		// Use custom S3 client if provided, otherwise create one
		if (this.configuration.s3Client) {
			this.s3Client = this.configuration.s3Client;
		} else {
			const clientConfig: any = {
				region: this.configuration.region,
			};

			if (this.configuration.credentials) {
				clientConfig.credentials = this.configuration.credentials;
			}

			if (this.configuration.endpoint) {
				clientConfig.endpoint = this.configuration.endpoint;
				clientConfig.forcePathStyle = this.configuration.forcePathStyle;
			}

			this.s3Client = new S3Client(clientConfig);
		}

		// Test S3 connection by checking if bucket exists
		try {
			const command = new HeadObjectCommand({
				Bucket: this.configuration.bucket,
				Key: "test-connection", // This will likely return 404, but that's fine
			});

			await this.s3Client.send(command);
		} catch (error: any) {
			// 404 is expected for the test key, any other error indicates connection issues
			if (error.$metadata?.httpStatusCode !== 404) {
				// Don't show credential errors as connection failures in development
				if (error.message?.includes("Could not load credentials")) {
					console.warn(`  ${kleur.yellow("S3 warning:")} ${error.message}`);
					console.warn(
						`  ${kleur.yellow("Note:")} Ensure AWS credentials are properly configured for production use`,
					);
				} else {
					console.error(
						`  ${kleur.red("S3 connection failed:")} ${error.message}`,
					);
				}
			}
		}
	}

	async onListen() {
		const endpoint =
			this.configuration.endpoint ||
			`https://s3.${this.configuration.region}.amazonaws.com`;
		console.log(
			`  ${kleur.green("S3 extension configured:")} bucket=${this.configuration.bucket}, endpoint=${endpoint}`,
		);

		if (this.configuration.prefix) {
			console.log(
				`  ${kleur.blue("S3 key prefix:")} ${this.configuration.prefix}`,
			);
		}
	}
}
