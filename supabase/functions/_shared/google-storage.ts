import { Storage, GetSignedUrlConfig, Bucket } from "npm:@google-cloud/storage@^7.16.0";

export interface GoogleStorageConfig {
  bucketName: string;
  credentials: object; // JSON key object
}

export interface UploadResult {
  blobUrl: string; // WARNING: For metadata only - DO NOT use for file access. Use generateSignedUrl() instead
  blobName: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  mimeType: string;
  checksum: string;
  lastModified: Date;
}

export class GoogleCloudStorageService {
  private storage: Storage;
  private bucket: Bucket;

  constructor(config: GoogleStorageConfig) {
    this.storage = new Storage({ credentials: config.credentials });
    this.bucket = this.storage.bucket(config.bucketName);
  }

  async uploadFile(
    tenantId: string,
    userId: string,
    folderPath: string,
    fileName: string,
    fileData: Uint8Array,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    // Use secure path structure: tenant/<tenant_id>/<folderPath>/* 
    // For doc-intel: tenant/<tenant_id>/documents/<doc_id>/*
    const blobName = `tenant/${tenantId}/${folderPath}/${timestamp}_${fileName}`;
    const file = this.bucket.file(blobName);
    const options: any = {
      metadata: {
        contentType: mimeType,
        userId: userId,
        tenantId: tenantId,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    };
    await file.save(fileData, options);
    return {
      blobUrl: `https://storage.googleapis.com/${this.bucket.name}/${blobName}`,
      blobName,
    };
  }

  async downloadFile(blobName: string): Promise<Uint8Array> {
    console.log("Downloading file:", blobName);
    const file = this.bucket.file(blobName);
    const [contents] = await file.download();
    return new Uint8Array(contents);
  }

  async deleteFile(blobName: string): Promise<void> {
    const file = this.bucket.file(blobName);
    try {
      await file.delete();
    } catch (error: any) {
      if (error.code !== 404)
        throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async getFileMetadata(blobName: string): Promise<FileMetadata | null> {
    const file = this.bucket.file(blobName);
    try {
      const [metadata] = await file.getMetadata();
      return {
        name: blobName.split("/").pop() || "",
        size: Number(metadata.size) || 0,
        mimeType: metadata.contentType || "application/octet-stream",
        checksum: metadata.md5Hash || "",
        lastModified: new Date(metadata.updated || Date.now()),
      };
    } catch (error: any) {
      if (error.code === 404) return null;
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  async listFiles(prefix: string): Promise<FileMetadata[]> {
    const [files] = await this.bucket.getFiles({ prefix });
    const result: FileMetadata[] = [];
    for (const file of files) {
      const metadata = await this.getFileMetadata(file.name);
      if (metadata) result.push(metadata);
    }
    return result;
  }

  async copyFile(
    sourceBlobName: string,
    destinationBlobName: string
  ): Promise<void> {
    const sourceFile = this.bucket.file(sourceBlobName);
    const destFile = this.bucket.file(destinationBlobName);
    await sourceFile.copy(destFile);
  }

  /**
   * Generates a secure signed URL for file access with limited time expiration.
   * This is the ONLY secure method to provide file access.
   * @param blobName The blob name/path in the storage bucket
   * @param expiresInHours Hours until URL expires (max 1 hour recommended for security)
   * @returns A time-limited signed URL
   */
  async generateSignedUrl(
    blobName: string,
    expiresInHours: number = 1
  ): Promise<string> {
    // Enforce security: maximum 1 hour expiration
    const maxExpirationHours = Math.min(expiresInHours, 1);
    
    const file = this.bucket.file(blobName);
    const options: GetSignedUrlConfig = {
      action: "read",
      expires: Date.now() + maxExpirationHours * 60 * 60 * 1000,
    };
    const [url] = await file.getSignedUrl(options);
    return url;
  }

  // For call recordings (backward compatibility)
  async uploadVideo(
    userId: string,
    recordingId: string,
    videoData: Uint8Array,
    mimeType: string
  ): Promise<UploadResult> {
    const blobName = `videos/${userId}/${recordingId}/${Date.now()}.webm`;
    const file = this.bucket.file(blobName);
    await file.save(videoData, { metadata: { contentType: mimeType } });
    return {
      blobUrl: `https://storage.googleapis.com/${this.bucket.name}/${blobName}`,
      blobName,
    };
  }

  async uploadTranscript(
    userId: string,
    recordingId: string,
    markdownContent: string
  ): Promise<UploadResult> {
    const blobName = `transcripts/${userId}/${recordingId}/transcript_${Date.now()}.md`;
    const file = this.bucket.file(blobName);
    const content = new TextEncoder().encode(markdownContent);
    await file.save(content, { metadata: { contentType: "text/markdown" } });
    return {
      blobUrl: `https://storage.googleapis.com/${this.bucket.name}/${blobName}`,
      blobName,
    };
  }

  async downloadBlob(blobName: string): Promise<Uint8Array> {
    return await this.downloadFile(blobName);
  }

  async deleteBlob(blobName: string): Promise<void> {
    return await this.deleteFile(blobName);
  }

  // SECURITY: This method provides direct public access and should not be used
  // Use generateSignedUrl() instead for secure access
  // getBlobUrl(blobName: string): string {
  //   return `https://storage.googleapis.com/${this.bucket.name}/${blobName}`;
  // }

  async ensureBucketExists(): Promise<void> {
    const [exists] = await this.bucket.exists();
    if (!exists) {
      await this.bucket.create();
    }
  }
}
