'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { IconUpload, IconFileText, IconX } from '@tabler/icons-react';
import Dropzone from 'react-dropzone';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useUploadDocument } from '@/hooks/useDocIntel';
import { cn, formatBytes } from '@/lib/utils';

interface DocumentUploadProps {
  onUploadComplete?: () => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const uploadDocument = useUploadDocument();
  
  // Store active intervals and timeouts for cleanup
  const activeIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const activeTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  // Cleanup all intervals and timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all active progress intervals
      Object.values(activeIntervals.current).forEach(clearInterval);
      activeIntervals.current = {};
      
      // Clear all active cleanup timeouts
      Object.values(activeTimeouts.current).forEach(clearTimeout);
      activeTimeouts.current = {};
    };
  }, []);

  // Validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const SUPPORTED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];

  // Helper function to validate a single file
  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `${file.name} is too large. Maximum file size is 50MB.`
      };
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `${file.name} is not a supported file type. Only PDF, DOCX, DOC, and TXT files are allowed.`
      };
    }

    return { isValid: true };
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files first
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const { file, errors } = rejection;
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum file size is 50MB.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a supported file type. Only PDF, DOCX, DOC, and TXT files are allowed.`);
          } else {
            toast.error(`${file.name} was rejected: ${error.message}`);
          }
        });
      });
    }

    // Additional validation for accepted files (defensive programming)
    const validFiles: File[] = [];
    
    acceptedFiles.forEach(file => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        toast.error(validation.error!);
        return;
      }
      validFiles.push(file);
    });

    // Only process valid files
    if (validFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...validFiles]);
      
      // Start upload for each valid file
      validFiles.forEach(file => {
        uploadFile(file);
      });
    }
  }, []);

  const uploadFile = async (file: File) => {
    // Final validation check before upload
    const validation = validateFile(file);
    if (!validation.isValid) {
      toast.error(validation.error!);
      return;
    }

    try {
      // Initialize progress
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

      // Simulate progress (in a real app, this would come from the upload API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[file.name] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            delete activeIntervals.current[file.name];
            return prev;
          }
          return { ...prev, [file.name]: currentProgress + 10 };
        });
      }, 200);
      
      // Store the interval for cleanup
      activeIntervals.current[file.name] = progressInterval;

      await uploadDocument.mutateAsync(file);

      // Complete progress
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      
      // Clear any remaining progress interval
      if (activeIntervals.current[file.name]) {
        clearInterval(activeIntervals.current[file.name]);
        delete activeIntervals.current[file.name];
      }
      
      // Remove file from upload list after a delay
      const cleanupTimeout = setTimeout(() => {
        setUploadFiles(prev => prev.filter(f => f.name !== file.name));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        delete activeTimeouts.current[file.name];
      }, 2000);
      
      // Store the timeout for cleanup
      activeTimeouts.current[file.name] = cleanupTimeout;

      toast.success(`${file.name} uploaded successfully`);
      onUploadComplete?.();
      
    } catch (error) {
      // Clear any active intervals for this file
      if (activeIntervals.current[file.name]) {
        clearInterval(activeIntervals.current[file.name]);
        delete activeIntervals.current[file.name];
      }
      
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
        return newProgress;
      });
      toast.error(`Failed to upload ${file.name}`);
    }
  };

  const removeFile = (fileName: string) => {
    // Clear any active intervals for this file
    if (activeIntervals.current[fileName]) {
      clearInterval(activeIntervals.current[fileName]);
      delete activeIntervals.current[fileName];
    }
    
    // Clear any active timeouts for this file
    if (activeTimeouts.current[fileName]) {
      clearTimeout(activeTimeouts.current[fileName]);
      delete activeTimeouts.current[fileName];
    }
    
    setUploadFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const getFileIcon = (_file: File) => {
    return <IconFileText className="h-5 w-5 text-blue-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Upload legal documents for AI-powered analysis and entity extraction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dropzone
          onDrop={onDrop}
          accept={{
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt']
          }}
          maxSize={MAX_FILE_SIZE}
          multiple
          disabled={uploadDocument.isPending}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
                uploadDocument.isPending && 'cursor-not-allowed opacity-50'
              )}
            >
              <input {...getInputProps()} />
              <IconUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragActive
                    ? 'Drop documents here'
                    : 'Click to upload or drag and drop'
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  Support for PDF, DOCX, DOC, and TXT files up to 50MB each
                </p>
              </div>
            </div>
          )}
        </Dropzone>

        {/* File upload list */}
        {uploadFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Uploading files</h4>
            {uploadFiles.map((file) => (
              <div
                key={file.name}
                className="flex items-center space-x-3 p-3 border rounded-lg"
              >
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatBytes(file.size)}
                      </Badge>
                      {uploadProgress[file.name] === 100 ? (
                        <Badge className="bg-green-500 text-xs">Complete</Badge>
                      ) : uploadProgress[file.name] !== undefined ? (
                        <Badge variant="secondary" className="text-xs">
                          {uploadProgress[file.name]}%
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.name)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <IconX className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {uploadProgress[file.name] !== undefined && uploadProgress[file.name] < 100 && (
                    <Progress value={uploadProgress[file.name]} className="h-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analysis features info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
            <div>
              <h5 className="text-sm font-medium">Entity Extraction</h5>
              <p className="text-xs text-muted-foreground">
                Automatically identify parties, dates, amounts, and key terms
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <div>
              <h5 className="text-sm font-medium">Clause Detection</h5>
              <p className="text-xs text-muted-foreground">
                Find and categorize important contract clauses
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-2" />
            <div>
              <h5 className="text-sm font-medium">Risk Analysis</h5>
              <p className="text-xs text-muted-foreground">
                Identify potential risks and compliance issues
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}