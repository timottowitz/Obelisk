/**
 * Email Export Service
 * Handles email export functionality with support for PDF, EML, and other formats
 * Provides legal-quality export formatting for case management
 */

import { EmailArchiveItem, EmailAttachment, EmailExportRequest } from './email-archive';

export interface PDFExportOptions {
  includeHeaders: boolean;
  includeAttachmentList: boolean;
  includeMetadata: boolean;
  headerLayout: 'detailed' | 'compact';
  pageFormat: 'A4' | 'Letter';
  fontSize: 'small' | 'normal' | 'large';
  includeSignature: boolean;
  watermark?: string;
  customHeader?: string;
  customFooter?: string;
}

export interface EMLExportOptions {
  preserveOriginalFormat: boolean;
  includeAttachments: boolean;
  sanitizeHeaders: boolean;
}

export interface ExportProgress {
  currentStep: string;
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  processedEmails: number;
  totalEmails: number;
  currentEmail?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'pdf' | 'eml' | 'csv';
  options: Record<string, any>;
  isDefault: boolean;
  createdAt: string;
}

export class EmailExportService {
  /**
   * Export emails to PDF with legal formatting
   */
  async exportToPDF(
    emails: EmailArchiveItem[],
    options: PDFExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> {
    const totalEmails = emails.length;
    let processedEmails = 0;

    // Initialize progress
    onProgress?.({
      currentStep: 'Preparing PDF export',
      progress: 0,
      estimatedTimeRemaining: totalEmails * 2, // Rough estimate
      processedEmails: 0,
      totalEmails
    });

    try {
      // Dynamic import of PDF library to reduce bundle size
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: options.pageFormat.toLowerCase() as 'a4' | 'letter'
      });

      // Set up PDF metadata
      pdf.setProperties({
        title: `Email Archive Export - ${new Date().toISOString().split('T')[0]}`,
        subject: 'Email Archive Export',
        author: 'Obelisk Case Management System',
        creator: 'Obelisk Email Archive',
        creationDate: new Date()
      });

      let yPosition = 20;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      const lineHeight = 6;

      // Add title page
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email Archive Export', margin, yPosition);
      
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPosition);
      pdf.text(`Total Emails: ${totalEmails}`, margin, yPosition + lineHeight);
      
      if (options.customHeader) {
        yPosition += lineHeight * 2;
        pdf.text(options.customHeader, margin, yPosition);
      }

      yPosition += 20;

      // Process each email
      for (const email of emails) {
        onProgress?.({
          currentStep: `Processing email: ${email.subject?.substring(0, 50) || 'Untitled'}...`,
          progress: Math.round((processedEmails / totalEmails) * 100),
          estimatedTimeRemaining: (totalEmails - processedEmails) * 1.5,
          processedEmails,
          totalEmails,
          currentEmail: email.subject
        });

        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Email header
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, yPosition, pdf.internal.pageSize.width - margin, yPosition);
        yPosition += 5;

        // Subject
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const subject = email.subject || '(No Subject)';
        pdf.text(`Subject: ${subject}`, margin, yPosition);
        yPosition += lineHeight + 2;

        // From/To information
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const fromText = email.senderName 
          ? `From: ${email.senderName} <${email.senderEmail}>`
          : `From: ${email.senderEmail}`;
        pdf.text(fromText, margin, yPosition);
        yPosition += lineHeight;

        const toText = `To: ${email.recipientEmails.join(', ')}`;
        pdf.text(toText, margin, yPosition);
        yPosition += lineHeight;

        // Date and time
        const dateText = `Date: ${new Date(email.receivedAt).toLocaleString()}`;
        pdf.text(dateText, margin, yPosition);
        yPosition += lineHeight;

        // Importance and flags
        if (email.importance !== 'normal' || email.hasAttachments) {
          const flags = [];
          if (email.importance !== 'normal') {
            flags.push(`Priority: ${email.importance.toUpperCase()}`);
          }
          if (email.hasAttachments) {
            flags.push(`Attachments: ${email.attachmentCount}`);
          }
          pdf.text(flags.join(' | '), margin, yPosition);
          yPosition += lineHeight;
        }

        // Headers (if requested)
        if (options.includeHeaders && options.headerLayout === 'detailed') {
          yPosition += 3;
          pdf.setFont('helvetica', 'bold');
          pdf.text('Message Headers:', margin, yPosition);
          yPosition += lineHeight;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          // Add common headers (mock data for now)
          const headers = [
            `Message-ID: ${email.messageId || '<not available>'}`,
            `Conversation-ID: ${email.conversationId || '<not available>'}`,
            `Thread-Topic: ${email.threadTopic || '<not available>'}`
          ];
          
          headers.forEach(header => {
            pdf.text(header, margin + 5, yPosition);
            yPosition += 4;
          });
          
          pdf.setFontSize(10);
        }

        yPosition += 5;

        // Email content would go here (simplified for now)
        pdf.setFont('helvetica', 'normal');
        pdf.text('Email content would be rendered here...', margin, yPosition);
        yPosition += lineHeight * 2;

        // Attachment list (if requested and attachments exist)
        if (options.includeAttachmentList && email.hasAttachments && email.attachments) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('Attachments:', margin, yPosition);
          yPosition += lineHeight;
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          
          email.attachments.forEach(attachment => {
            const attachmentText = `• ${attachment.filename} (${this.formatBytes(attachment.sizeBytes)})`;
            pdf.text(attachmentText, margin + 5, yPosition);
            yPosition += 5;
          });
          
          pdf.setFontSize(10);
        }

        yPosition += 10;
        processedEmails++;
      }

      // Add footer with export metadata
      if (options.customFooter || options.includeMetadata) {
        pdf.addPage();
        yPosition = margin;
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Export Information', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        
        const metadata = [
          `Export Date: ${new Date().toLocaleString()}`,
          `Total Emails: ${totalEmails}`,
          `Export Format: PDF`,
          `Generated by: Obelisk Case Management System`
        ];
        
        if (options.customFooter) {
          metadata.push(`Notes: ${options.customFooter}`);
        }
        
        metadata.forEach(item => {
          pdf.text(item, margin, yPosition);
          yPosition += lineHeight;
        });
      }

      // Add watermark if specified
      if (options.watermark) {
        const pageCount = pdf.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          pdf.setTextColor(200, 200, 200);
          pdf.setFontSize(24);
          pdf.text(options.watermark, 
            pdf.internal.pageSize.width / 2, 
            pdf.internal.pageSize.height / 2, 
            { align: 'center', angle: 45 }
          );
        }
      }

      onProgress?.({
        currentStep: 'Finalizing PDF',
        progress: 100,
        estimatedTimeRemaining: 0,
        processedEmails: totalEmails,
        totalEmails
      });

      // Convert to blob
      const pdfBlob = pdf.output('blob');
      return pdfBlob;

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export emails to EML format
   */
  async exportToEML(
    emails: EmailArchiveItem[],
    options: EMLExportOptions,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob[]> {
    const emlFiles: Blob[] = [];
    const totalEmails = emails.length;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      onProgress?.({
        currentStep: `Converting email to EML: ${email.subject?.substring(0, 50) || 'Untitled'}...`,
        progress: Math.round((i / totalEmails) * 100),
        estimatedTimeRemaining: (totalEmails - i) * 0.5,
        processedEmails: i,
        totalEmails,
        currentEmail: email.subject
      });

      const emlContent = this.generateEMLContent(email, options);
      const emlBlob = new Blob([emlContent], { type: 'message/rfc822' });
      emlFiles.push(emlBlob);
    }

    onProgress?.({
      currentStep: 'EML export completed',
      progress: 100,
      estimatedTimeRemaining: 0,
      processedEmails: totalEmails,
      totalEmails
    });

    return emlFiles;
  }

  /**
   * Export emails to CSV format
   */
  async exportToCSV(
    emails: EmailArchiveItem[],
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> {
    const headers = [
      'Subject',
      'From Name',
      'From Email',
      'To',
      'CC',
      'BCC',
      'Date Sent',
      'Date Received',
      'Importance',
      'Has Attachments',
      'Attachment Count',
      'Size (bytes)',
      'Message ID',
      'Conversation ID',
      'Tags'
    ];

    const csvRows = [headers.join(',')];

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      onProgress?.({
        currentStep: `Processing email for CSV: ${email.subject?.substring(0, 50) || 'Untitled'}...`,
        progress: Math.round((i / emails.length) * 100),
        estimatedTimeRemaining: (emails.length - i) * 0.1,
        processedEmails: i,
        totalEmails: emails.length,
        currentEmail: email.subject
      });

      const row = [
        this.escapeCsvValue(email.subject || ''),
        this.escapeCsvValue(email.senderName || ''),
        this.escapeCsvValue(email.senderEmail),
        this.escapeCsvValue(email.recipientEmails.join('; ')),
        this.escapeCsvValue(email.ccEmails?.join('; ') || ''),
        this.escapeCsvValue(email.bccEmails?.join('; ') || ''),
        this.escapeCsvValue(email.sentAt || ''),
        this.escapeCsvValue(email.receivedAt),
        this.escapeCsvValue(email.importance),
        email.hasAttachments ? 'Yes' : 'No',
        email.attachmentCount.toString(),
        email.totalAttachmentSize.toString(),
        this.escapeCsvValue(email.messageId || ''),
        this.escapeCsvValue(email.conversationId || ''),
        this.escapeCsvValue(email.customTags.join('; '))
      ];

      csvRows.push(row.join(','));
    }

    onProgress?.({
      currentStep: 'CSV export completed',
      progress: 100,
      estimatedTimeRemaining: 0,
      processedEmails: emails.length,
      totalEmails: emails.length
    });

    const csvContent = csvRows.join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Create ZIP archive with emails and attachments
   */
  async exportToZIP(
    emails: EmailArchiveItem[],
    includeAttachments: boolean = true,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<Blob> {
    // Dynamic import to reduce bundle size
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const emailsFolder = zip.folder('emails');
    const attachmentsFolder = includeAttachments ? zip.folder('attachments') : null;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      onProgress?.({
        currentStep: `Adding email to ZIP: ${email.subject?.substring(0, 50) || 'Untitled'}...`,
        progress: Math.round((i / emails.length) * 90), // Leave 10% for ZIP generation
        estimatedTimeRemaining: (emails.length - i) * 1.0,
        processedEmails: i,
        totalEmails: emails.length,
        currentEmail: email.subject
      });

      // Add email as EML file
      const emlContent = this.generateEMLContent(email, { 
        preserveOriginalFormat: true, 
        includeAttachments: false, 
        sanitizeHeaders: false 
      });
      
      const safeFilename = this.sanitizeFilename(email.subject || `email_${i + 1}`);
      emailsFolder?.file(`${safeFilename}.eml`, emlContent);

      // Add attachments if requested
      if (includeAttachments && email.hasAttachments && email.attachments) {
        const emailFolder = attachmentsFolder?.folder(safeFilename);
        
        for (const attachment of email.attachments) {
          try {
            // This would fetch the actual attachment content
            // For now, we'll create a placeholder
            emailFolder?.file(attachment.filename, `Attachment content for ${attachment.filename}`);
          } catch (error) {
            console.warn(`Failed to add attachment ${attachment.filename}:`, error);
          }
        }
      }
    }

    onProgress?.({
      currentStep: 'Generating ZIP file...',
      progress: 95,
      estimatedTimeRemaining: 2,
      processedEmails: emails.length,
      totalEmails: emails.length
    });

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    onProgress?.({
      currentStep: 'ZIP export completed',
      progress: 100,
      estimatedTimeRemaining: 0,
      processedEmails: emails.length,
      totalEmails: emails.length
    });

    return zipBlob;
  }

  /**
   * Generate EML content for an email
   */
  private generateEMLContent(email: EmailArchiveItem, options: EMLExportOptions): string {
    const lines: string[] = [];

    // Add headers
    if (email.messageId) {
      lines.push(`Message-ID: ${email.messageId}`);
    }
    
    lines.push(`Date: ${new Date(email.receivedAt).toUTCString()}`);
    lines.push(`From: ${email.senderName ? `${email.senderName} <${email.senderEmail}>` : email.senderEmail}`);
    lines.push(`To: ${email.recipientEmails.join(', ')}`);
    
    if (email.ccEmails && email.ccEmails.length > 0) {
      lines.push(`Cc: ${email.ccEmails.join(', ')}`);
    }
    
    if (email.bccEmails && email.bccEmails.length > 0) {
      lines.push(`Bcc: ${email.bccEmails.join(', ')}`);
    }
    
    lines.push(`Subject: ${email.subject || '(No Subject)'}`);
    
    if (email.conversationId) {
      lines.push(`Thread-Index: ${email.conversationId}`);
    }
    
    if (email.importance !== 'normal') {
      lines.push(`Importance: ${email.importance}`);
      lines.push(`Priority: ${email.importance}`);
    }

    // MIME headers
    lines.push('MIME-Version: 1.0');
    lines.push('Content-Type: text/plain; charset=UTF-8');
    lines.push('Content-Transfer-Encoding: 8bit');
    
    // Blank line before body
    lines.push('');
    
    // Email body (placeholder for now)
    lines.push('This email was exported from Obelisk Case Management System.');
    lines.push('Original email content would appear here.');
    
    if (email.hasAttachments && email.attachments) {
      lines.push('');
      lines.push('Attachments:');
      email.attachments.forEach(attachment => {
        lines.push(`- ${attachment.filename} (${this.formatBytes(attachment.sizeBytes)})`);
      });
    }

    return lines.join('\r\n');
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // Limit length
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get default export templates
   */
  getDefaultTemplates(): ExportTemplate[] {
    return [
      {
        id: 'legal_pdf',
        name: 'Legal PDF Report',
        description: 'Professional PDF format suitable for legal proceedings',
        format: 'pdf',
        options: {
          includeHeaders: true,
          includeAttachmentList: true,
          includeMetadata: true,
          headerLayout: 'detailed',
          pageFormat: 'Letter',
          fontSize: 'normal',
          includeSignature: true
        },
        isDefault: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'simple_pdf',
        name: 'Simple PDF Report',
        description: 'Clean, simple PDF format for general use',
        format: 'pdf',
        options: {
          includeHeaders: false,
          includeAttachmentList: true,
          includeMetadata: false,
          headerLayout: 'compact',
          pageFormat: 'A4',
          fontSize: 'normal',
          includeSignature: false
        },
        isDefault: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'archive_eml',
        name: 'EML Archive',
        description: 'Original email format for archival purposes',
        format: 'eml',
        options: {
          preserveOriginalFormat: true,
          includeAttachments: true,
          sanitizeHeaders: false
        },
        isDefault: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'spreadsheet_csv',
        name: 'CSV Spreadsheet',
        description: 'Spreadsheet format for data analysis',
        format: 'csv',
        options: {},
        isDefault: false,
        createdAt: new Date().toISOString()
      }
    ];
  }
}

// Export singleton instance
export const emailExportService = new EmailExportService();