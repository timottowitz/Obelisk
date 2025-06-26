// Azure Blob Storage Service for Call Recordings using official SDK
import { BlobServiceClient, StorageSharedKeyCredential } from "npm:@azure/storage-blob@^12.17.0";

export interface AzureStorageConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
}

export interface UploadResult {
  blobUrl: string;
  blobName: string;
}

export class AzureBlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;

  constructor(config: AzureStorageConfig) {
    // Create a SharedKeyCredential object
    const sharedKeyCredential = new StorageSharedKeyCredential(
      config.accountName,
      config.accountKey
    );

    // Create a BlobServiceClient object
    this.blobServiceClient = new BlobServiceClient(
      `https://${config.accountName}.blob.core.windows.net`,
      sharedKeyCredential
    );

    // Get a container client
    this.containerClient = this.blobServiceClient.getContainerClient(config.containerName);
  }

  async uploadVideo(userId: string, recordingId: string, videoData: Uint8Array, mimeType: string): Promise<UploadResult> {
    const blobName = `videos/${userId}/${recordingId}/${Date.now()}.webm`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      // Upload the video data
      await blockBlobClient.uploadData(videoData, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
      });

      return {
        blobUrl: blockBlobClient.url,
        blobName: blobName,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload video: ${error.message}`);
    }
  }

  async uploadTranscript(userId: string, recordingId: string, markdownContent: string): Promise<UploadResult> {
    const blobName = `transcripts/${userId}/${recordingId}/transcript_${Date.now()}.md`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      // Convert string to Uint8Array
      const content = new TextEncoder().encode(markdownContent);

      // Upload the transcript data
      await blockBlobClient.uploadData(content, {
        blobHTTPHeaders: {
          blobContentType: 'text/markdown',
        },
      });

      return {
        blobUrl: blockBlobClient.url,
        blobName: blobName,
      };
    } catch (error: any) {
      throw new Error(`Failed to upload transcript: ${error.message}`);
    }
  }

  async downloadBlob(blobName: string): Promise<Uint8Array> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      // Download the blob
      const downloadResponse = await blockBlobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream body in response');
      }

      // Try to use arrayBuffer method first (most reliable in Deno)
      try {
        const arrayBuffer = await downloadResponse.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (arrayBufferError) {
        // Fallback to stream reading if arrayBuffer fails
        console.log('arrayBuffer method failed, falling back to stream reading');
        
        // Convert stream to array buffer using Deno-compatible approach
        const chunks: Uint8Array[] = [];
        
        // Handle different stream types
        if (downloadResponse.readableStreamBody instanceof ReadableStream) {
          const reader = downloadResponse.readableStreamBody.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } else if (downloadResponse.readableStreamBody && typeof downloadResponse.readableStreamBody.on === 'function') {
          // Handle Node.js stream-like objects
          return new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            
            downloadResponse.readableStreamBody.on('data', (chunk: Uint8Array) => {
              chunks.push(chunk);
            });
            
            downloadResponse.readableStreamBody.on('end', () => {
              // Combine chunks into single Uint8Array
              const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
              const result = new Uint8Array(totalLength);
              let offset = 0;
              
              for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
              }
              resolve(result);
            });
            
            downloadResponse.readableStreamBody.on('error', (error: any) => {
              reject(new Error(`Stream error: ${error.message}`));
            });
          });
        } else {
          throw new Error('Unsupported stream type');
        }

        // Combine chunks into single Uint8Array
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }

        return result;
      }
    } catch (error: any) {
      throw new Error(`Failed to download blob: ${error.message}`);
    }
  }

  async deleteBlob(blobName: string): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);

    try {
      await blockBlobClient.delete();
    } catch (error: any) {
      // Don't throw error if blob doesn't exist (404)
      if (error.statusCode !== 404) {
        throw new Error(`Failed to delete blob: ${error.message}`);
      }
    }
  }

  getBlobUrl(blobName: string): string {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    return blockBlobClient.url;
  }

  // Helper method to check if container exists, create if not
  async ensureContainerExists(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists();
    } catch (error: any) {
      throw new Error(`Failed to ensure container exists: ${error.message}`);
    }
  }
} 