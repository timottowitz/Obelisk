'use client';

import React, { useState, useCallback } from 'react';
import { 
  Download, 
  FileText, 
  Archive, 
  Table, 
  Mail,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Eye,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { emailArchiveService } from '@/lib/services/email-archive';
import { emailExportService } from '@/lib/services/email-export';
import { toast } from 'sonner';

interface EmailExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  emailIds: string[];
  emailCount: number;
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'pdf' | 'eml' | 'csv' | 'zip';
  options: Record<string, any>;
  isDefault: boolean;
}

interface ExportProgress {
  status: 'idle' | 'preparing' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  downloadUrl?: string;
  fileSize?: number;
  exportId?: string;
}

const exportFormats = [
  {
    id: 'pdf',
    name: 'PDF Report',
    description: 'Professional PDF format suitable for legal proceedings and documentation',
    icon: FileText,
    recommended: true,
    features: ['Legal formatting', 'Headers & metadata', 'Attachment list', 'Digital signatures']
  },
  {
    id: 'eml',
    name: 'EML Files',
    description: 'Original email format that can be opened in any email client',
    icon: Mail,
    recommended: false,
    features: ['Original format', 'Email client compatible', 'Preserves structure', 'Attachments included']
  },
  {
    id: 'csv',
    name: 'CSV Spreadsheet',
    description: 'Spreadsheet format for data analysis and reporting',
    icon: Table,
    recommended: false,
    features: ['Data analysis', 'Excel compatible', 'Searchable', 'Metadata only']
  },
  {
    id: 'zip',
    name: 'ZIP Archive',
    description: 'Complete archive with emails and all attachments',
    icon: Archive,
    recommended: false,
    features: ['Complete archive', 'All attachments', 'Organized folders', 'Bulk download']
  }
];

function FormatCard({ 
  format, 
  selected, 
  onSelect 
}: { 
  format: typeof exportFormats[0]; 
  selected: boolean; 
  onSelect: () => void;
}) {
  const Icon = format.icon;
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">{format.name}</CardTitle>
          </div>
          {format.recommended && (
            <Badge variant="secondary" className="text-xs">Recommended</Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          {format.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-1">
          {format.features.map((feature) => (
            <div key={feature} className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {feature}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PDFOptions({ 
  options, 
  onChange 
}: { 
  options: any; 
  onChange: (options: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Page Format</Label>
          <RadioGroup 
            value={options.pageFormat || 'Letter'} 
            onValueChange={(value) => onChange({ ...options, pageFormat: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Letter" id="letter" />
              <Label htmlFor="letter" className="text-sm">Letter (8.5" x 11")</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="A4" id="a4" />
              <Label htmlFor="a4" className="text-sm">A4</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Font Size</Label>
          <RadioGroup 
            value={options.fontSize || 'normal'} 
            onValueChange={(value) => onChange({ ...options, fontSize: value })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="small" id="small" />
              <Label htmlFor="small" className="text-sm">Small</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="normal" id="normal" />
              <Label htmlFor="normal" className="text-sm">Normal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="large" id="large" />
              <Label htmlFor="large" className="text-sm">Large</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeHeaders"
            checked={options.includeHeaders || false}
            onCheckedChange={(checked) => onChange({ ...options, includeHeaders: checked })}
          />
          <Label htmlFor="includeHeaders" className="text-sm">Include Email Headers</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeAttachmentList"
            checked={options.includeAttachmentList !== false}
            onCheckedChange={(checked) => onChange({ ...options, includeAttachmentList: checked })}
          />
          <Label htmlFor="includeAttachmentList" className="text-sm">List Attachments</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeMetadata"
            checked={options.includeMetadata !== false}
            onCheckedChange={(checked) => onChange({ ...options, includeMetadata: checked })}
          />
          <Label htmlFor="includeMetadata" className="text-sm">Include Metadata</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="includeSignature"
            checked={options.includeSignature !== false}
            onCheckedChange={(checked) => onChange({ ...options, includeSignature: checked })}
          />
          <Label htmlFor="includeSignature" className="text-sm">Digital Signature</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="watermark" className="text-sm font-medium">Watermark (optional)</Label>
        <Input
          id="watermark"
          placeholder="e.g., CONFIDENTIAL"
          value={options.watermark || ''}
          onChange={(e) => onChange({ ...options, watermark: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customHeader" className="text-sm font-medium">Custom Header</Label>
          <Textarea
            id="customHeader"
            placeholder="Custom header text..."
            value={options.customHeader || ''}
            onChange={(e) => onChange({ ...options, customHeader: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customFooter" className="text-sm font-medium">Custom Footer</Label>
          <Textarea
            id="customFooter"
            placeholder="Custom footer text..."
            value={options.customFooter || ''}
            onChange={(e) => onChange({ ...options, customFooter: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

function ProgressView({ progress }: { progress: ExportProgress }) {
  const getStatusIcon = () => {
    switch (progress.status) {
      case 'processing':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <h3 className="font-medium text-sm">
            {progress.status === 'preparing' && 'Preparing export...'}
            {progress.status === 'processing' && 'Processing emails...'}
            {progress.status === 'completed' && 'Export completed!'}
            {progress.status === 'failed' && 'Export failed'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {progress.currentStep}
          </p>
        </div>
      </div>

      {progress.status === 'processing' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Progress</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
          
          {progress.estimatedTimeRemaining && (
            <p className="text-xs text-muted-foreground">
              Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}
            </p>
          )}
        </div>
      )}

      {progress.status === 'completed' && progress.downloadUrl && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-green-800 dark:text-green-200">
                  Your export is ready!
                </p>
                {progress.fileSize && (
                  <p className="text-xs text-green-600 dark:text-green-300">
                    File size: {formatFileSize(progress.fileSize)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (progress.downloadUrl) {
                      window.open(progress.downloadUrl, '_blank');
                    }
                  }}
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (progress.downloadUrl) {
                      navigator.clipboard.writeText(progress.downloadUrl);
                      toast.success('Download link copied to clipboard');
                    }
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {progress.status === 'failed' && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="font-medium text-sm text-red-800 dark:text-red-200">
              Export failed
            </p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">
              Please try again or contact support if the problem persists.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function EmailExportDialog({
  isOpen,
  onClose,
  caseId,
  emailIds,
  emailCount
}: EmailExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'eml' | 'csv' | 'zip'>('pdf');
  const [includeAttachments, setIncludeAttachments] = useState(true);
  const [formatOptions, setFormatOptions] = useState<Record<string, any>>({});
  const [progress, setProgress] = useState<ExportProgress>({ 
    status: 'idle', 
    progress: 0, 
    currentStep: '' 
  });
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);

  // Load templates on mount
  React.useEffect(() => {
    if (isOpen) {
      const defaultTemplates = emailExportService.getDefaultTemplates();
      setTemplates(defaultTemplates);
      
      // Set default options based on selected format
      const defaultTemplate = defaultTemplates.find(t => t.format === selectedFormat && t.isDefault);
      if (defaultTemplate) {
        setFormatOptions(defaultTemplate.options);
      }
    }
  }, [isOpen, selectedFormat]);

  const handleExport = useCallback(async () => {
    try {
      setProgress({ 
        status: 'preparing', 
        progress: 0, 
        currentStep: 'Preparing export request...' 
      });

      const exportRequest = {
        caseId,
        emailIds,
        exportType: selectedFormat,
        includeAttachments,
        includeHeaders: formatOptions.includeHeaders || false,
        formatOptions
      };

      // Request export from service
      const result = await emailArchiveService.requestEmailExport(exportRequest);

      setProgress({
        status: 'processing',
        progress: 10,
        currentStep: 'Processing emails...',
        exportId: result.id
      });

      // Poll for progress updates
      const pollProgress = async () => {
        try {
          const status = await emailArchiveService.getExportStatus(result.id);
          
          const progressPercent = (status.processedEmails / status.totalEmails) * 100;
          
          setProgress({
            status: status.status === 'completed' ? 'completed' : 'processing',
            progress: progressPercent,
            currentStep: status.status === 'completed' ? 
              'Export completed!' : 
              `Processing email ${status.processedEmails} of ${status.totalEmails}...`,
            downloadUrl: status.downloadUrl,
            fileSize: status.fileSize,
            exportId: result.id
          });

          if (status.status === 'completed') {
            toast.success('Export completed successfully!');
          } else if (status.status === 'failed') {
            setProgress({
              status: 'failed',
              progress: 0,
              currentStep: status.errorMessage || 'Export failed',
              exportId: result.id
            });
            toast.error('Export failed');
          } else if (status.status === 'processing') {
            // Continue polling
            setTimeout(pollProgress, 2000);
          }
        } catch (error) {
          console.error('Error polling export status:', error);
          setProgress({
            status: 'failed',
            progress: 0,
            currentStep: 'Failed to check export status',
            exportId: result.id
          });
        }
      };

      // Start polling after a short delay
      setTimeout(pollProgress, 1000);

    } catch (error) {
      console.error('Export failed:', error);
      setProgress({
        status: 'failed',
        progress: 0,
        currentStep: 'Failed to start export'
      });
      toast.error('Failed to start export');
    }
  }, [caseId, emailIds, selectedFormat, includeAttachments, formatOptions]);

  const handleClose = useCallback(() => {
    if (progress.status === 'processing') {
      // Don't close while processing
      return;
    }
    
    setProgress({ status: 'idle', progress: 0, currentStep: '' });
    setFormatOptions({});
    onClose();
  }, [progress.status, onClose]);

  const isExporting = progress.status === 'preparing' || progress.status === 'processing';
  const canExport = emailIds.length > 0 && !isExporting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Emails
          </DialogTitle>
          <DialogDescription>
            Export {emailCount} email{emailCount !== 1 ? 's' : ''} for case documentation and analysis
          </DialogDescription>
        </DialogHeader>

        {progress.status === 'idle' ? (
          <Tabs defaultValue="format" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Choose Export Format</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {exportFormats.map((format) => (
                      <FormatCard
                        key={format.id}
                        format={format}
                        selected={selectedFormat === format.id}
                        onSelect={() => setSelectedFormat(format.id as any)}
                      />
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeAttachments"
                    checked={includeAttachments}
                    onCheckedChange={setIncludeAttachments}
                  />
                  <Label htmlFor="includeAttachments" className="text-sm">
                    Include attachments
                  </Label>
                  <span className="text-xs text-muted-foreground ml-2">
                    (Increases export size and processing time)
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="options" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Export Options</h3>
                
                {selectedFormat === 'pdf' && (
                  <PDFOptions
                    options={formatOptions}
                    onChange={setFormatOptions}
                  />
                )}

                {selectedFormat === 'eml' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="preserveOriginalFormat"
                        checked={formatOptions.preserveOriginalFormat !== false}
                        onCheckedChange={(checked) => setFormatOptions({ 
                          ...formatOptions, 
                          preserveOriginalFormat: checked 
                        })}
                      />
                      <Label htmlFor="preserveOriginalFormat" className="text-sm">
                        Preserve original format
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sanitizeHeaders"
                        checked={formatOptions.sanitizeHeaders || false}
                        onCheckedChange={(checked) => setFormatOptions({ 
                          ...formatOptions, 
                          sanitizeHeaders: checked 
                        })}
                      />
                      <Label htmlFor="sanitizeHeaders" className="text-sm">
                        Sanitize headers (remove sensitive information)
                      </Label>
                    </div>
                  </div>
                )}

                {selectedFormat === 'csv' && (
                  <p className="text-sm text-muted-foreground">
                    CSV export includes email metadata only. No additional options available.
                  </p>
                )}

                {selectedFormat === 'zip' && (
                  <p className="text-sm text-muted-foreground">
                    ZIP export includes all emails in EML format with attachments organized in folders.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Export Templates</h3>
                <p className="text-xs text-muted-foreground">
                  Choose from pre-configured export templates for common use cases
                </p>

                <div className="space-y-2">
                  {templates
                    .filter(t => t.format === selectedFormat)
                    .map((template) => (
                    <Card 
                      key={template.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setFormatOptions(template.options);
                        toast.success(`Applied ${template.name} template`);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium">{template.name}</h4>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Apply
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-6">
            <ProgressView progress={progress} />
          </div>
        )}

        <DialogFooter>
          {progress.status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={!canExport}>
                <Download className="h-4 w-4 mr-2" />
                Start Export
              </Button>
            </>
          )}
          
          {progress.status === 'completed' && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
          
          {progress.status === 'failed' && (
            <>
              <Button variant="outline" onClick={() => setProgress({ 
                status: 'idle', 
                progress: 0, 
                currentStep: '' 
              })}>
                Try Again
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </>
          )}
          
          {isExporting && (
            <Button variant="outline" disabled>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}