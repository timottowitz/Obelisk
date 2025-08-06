'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Upload, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dyajs from 'dayjs';
import { useCasesOperations } from '@/hooks/useCases';
import { toast } from 'sonner';
import Link from 'next/link';
import { v1 as uuidv1 } from 'uuid';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function CaseForm({ initialData }: { initialData?: any }) {
  const { caseTypes: caseTypesData } = useCasesOperations();
  const caseTypes = caseTypesData.data || [];
  const caseTypesLoading = caseTypesData.isLoading;
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    full_name: string;
    phone: string;
    email: string;
    case_type_id: string;
    special_instructions: string;
    filing_fee: string;
    case_number: string;
    claimant: string;
    respondent: string;
    case_manager: string;
    adr_process: string;
    applicable_rules: string;
    track: string;
    claim_amount: string;
    hearing_locale: string;
    access: string;
    next_event: string;
    initial_task: string;
  }>({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    case_type_id: initialData?.case_type || '',
    special_instructions: initialData?.special_instructions || '',
    filing_fee: initialData?.filing_fee || '',
    case_number: initialData?.case_number || '',
    claimant: initialData?.claimant || '',
    respondent: initialData?.respondent || '',
    case_manager: initialData?.case_manager || '',
    adr_process: initialData?.adr_process || '',
    applicable_rules: initialData?.applicable_rules || '',
    track: initialData?.track || '',
    claim_amount: initialData?.claim_amount || '',
    hearing_locale: initialData?.hearing_locale || '',
    access: initialData?.access || 'admin_only',
    next_event: initialData?.next_event || '',
    initial_task: initialData?.initial_task || ''
  });

  const { createCase, updateCase } = useCasesOperations();
  const router = useRouter();
  const [createLoading, setCreateLoading] = useState(false);
  // Set default case type ID when case types are loaded
  useEffect(() => {
    if (caseTypes.length > 0 && !formData.case_type_id && !initialData) {
      setFormData((prev) => ({
        ...prev,
        case_type_id: caseTypes[0].id
      }));
    }
  }, [caseTypes, formData.case_type_id, initialData]);

  const handleInputChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [setFormData]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      //check file size and type
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          console.log(file);
          if (file.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB');
            return;
          }
          if (file.type !== 'application/pdf') {
            toast.error('File must be a PDF');
            return;
          }
        }
      }
      if (files) {
        const newFiles = Array.from(files).map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          id: uuidv1(),
          file: file
        }));
        setUploadedFiles([...uploadedFiles, ...newFiles]);
      }
    },
    [uploadedFiles]
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setCreateLoading(true);
      const case_number =
        dyajs().format('DD-MM') +
        '-' +
        Math.floor(10000000 + Math.random() * 90000000)
          .toString()
          .replace(/(\d{4})(\d{4})/, '$1-$2');

      try {
        if (initialData) {
          await updateCase.mutateAsync({
            caseId: initialData.id,
            formData: formData
          });
        } else {
          await createCase.mutateAsync({
            ...formData,
            case_number
          });
        }
        const type = caseTypes
          .find((type) => type.id === formData.case_type_id)
          ?.display_name.toLowerCase();
        toast.success(
          `Case ${initialData ? 'updated' : 'created'} successfully`
        );
        router.push(`/dashboard/cases?type=${type}`);
      } catch (error) {
        toast.error(`Case ${initialData ? 'update' : 'creation'} failed`);
      } finally {
        setCreateLoading(false);
      }
    },
    [initialData, formData, createCase, updateCase, router, caseTypes]
  );

  return (
    <>
      <Link href='/dashboard'>
        <p className='flex items-center gap-2 py-4 text-sm text-gray-500'>
          <ArrowLeft className='h-4 w-4' />
          Back to Dashboard
        </p>
      </Link>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-bold'>File a New Case</h1>
        <h3 className='text-sm text-gray-500'>
          Submit your arbitration or mediation case filing
        </h3>
      </div>
      <form onSubmit={handleSubmit} className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className='flex items-center gap-2'>
                <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-100'>
                  <span className='text-xs font-bold text-blue-600'>1</span>
                </div>
                Personal Information
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {/* Full Name */}
              <div className='space-y-2'>
                <Label htmlFor='full_name'>
                  Full Name <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='full_name'
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    handleInputChange('full_name', e.target.value)
                  }
                  placeholder='Enter full name'
                />
              </div>

              {/* Phone */}
              <div className='space-y-2'>
                <Label htmlFor='phone'>
                  Phone <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='phone'
                  value={formData.phone}
                  required
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder='Enter phone number'
                />
              </div>

              {/* Email */}
              <div className='space-y-2'>
                <Label htmlFor='email'>
                  Email <span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  required
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder='Enter email address'
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <div className='flex items-center gap-2'>
                <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-100'>
                  <span className='text-xs font-bold text-blue-600'>2</span>
                </div>
                Case Information
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {/* Claimant */}
              <div className='space-y-2'>
                <Label htmlFor='claimant'>
                  Claimant<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='claimant'
                  required
                  value={formData.claimant}
                  onChange={(e) =>
                    handleInputChange('claimant', e.target.value)
                  }
                  placeholder='Enter claimant name'
                />
              </div>
              {/* Case Number */}
              <div className='space-y-2'>
                <Label htmlFor='case_number'>Case Number</Label>
                <Input
                  id='case_number'
                  value={formData.case_number}
                  onChange={(e) =>
                    handleInputChange('case_number', e.target.value)
                  }
                  placeholder='Auto-generated if left blank'
                />
              </div>
              {/* Respondent */}
              <div className='space-y-2'>
                <Label htmlFor='respondent'>
                  Respondent<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='respondent'
                  required
                  value={formData.respondent}
                  onChange={(e) =>
                    handleInputChange('respondent', e.target.value)
                  }
                  placeholder='Enter respondent name'
                />
              </div>

              {/* Case Manager */}
              <div className='space-y-2'>
                <Label htmlFor='case_manager'>
                  Case Manager<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='case_manager'
                  required
                  value={formData.case_manager}
                  onChange={(e) =>
                    handleInputChange('case_manager', e.target.value)
                  }
                  placeholder='Enter case manager name'
                />
              </div>

              {/* Next Event Date */}
              <div className='space-y-2'>
                <Label htmlFor='next_event'>Next Event</Label>
                <Input
                  id='next_event'
                  type='date'
                  value={formData.next_event}
                  onChange={(e) =>
                    handleInputChange('next_event', e.target.value)
                  }
                  placeholder='Enter next event date'
                />
              </div>

              {/* Initial Task */}
              <div className='space-y-2'>
                <Label htmlFor='initial_task'>Initial Task</Label>
                <Textarea
                  id='initial_task'
                  value={formData.initial_task}
                  onChange={(e) =>
                    handleInputChange('initial_task', e.target.value)
                  }
                  placeholder='Enter initial task'
                  rows={4}
                />
              </div>

              {/* Case Type */}
              <div className='space-y-2'>
                <Label htmlFor='case_type_id'>
                  Case Type <span className='text-red-500'>*</span>
                </Label>
                {!caseTypesLoading && caseTypes.length > 0 ? (
                  <Select
                    value={formData.case_type_id}
                    onValueChange={(value) =>
                      handleInputChange('case_type_id', value)
                    }
                  >
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select case type' />
                    </SelectTrigger>
                    <SelectContent>
                      {caseTypes.map((type) => {
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            {type.display_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Loader2 className='h-3 w-3 animate-spin' />
                )}
              </div>

              {/* Access */}
              <div className='space-y-2'>
                <Label htmlFor='access'>
                  Access<span className='text-red-500'>*</span>
                </Label>
                <Select
                  value={formData.access}
                  onValueChange={(value) => handleInputChange('access', value)}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select access' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='admin_only'>Admin Only</SelectItem>
                    <SelectItem value='public'>Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Special Instructions */}
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='special_instructions'>
                  Special Instructions
                </Label>
                <Textarea
                  id='special_instructions'
                  value={formData.special_instructions}
                  onChange={(e) =>
                    handleInputChange('special_instructions', e.target.value)
                  }
                  placeholder='Provide any additional details about your case, special circumstances, or specific requirements.'
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 className='mb-6 flex items-center space-x-2 text-xl font-semibold text-gray-900'>
                <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-100'>
                  <span className='text-xs font-bold text-blue-600'>3</span>
                </div>
                <span>Documents (DOCS)</span>
              </h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-6'>
              <div className='rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-blue-400'>
                <Input
                  type='file'
                  id='fileUpload'
                  multiple
                  accept='.pdf'
                  onChange={handleFileUpload}
                  className='hidden'
                />
                <label htmlFor='fileUpload' className='cursor-pointer'>
                  <Upload className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                  <h3 className='mb-2 text-lg font-medium text-gray-900'>
                    Upload Case Documents
                  </h3>
                  <p className='mb-4 text-gray-600'>
                    Upload agreements, demands, court orders, and other relevant
                    documents
                  </p>
                  <div className='inline-flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700'>
                    <Upload className='h-4 w-4' />
                    <span className='font-medium'>Choose PDF Files</span>
                  </div>
                  <p className='mt-2 text-xs text-gray-500'>
                    PDF files only, max 10MB each
                  </p>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className='space-y-3'>
                  <h3 className='font-medium text-gray-900'>
                    Uploaded Documents ({uploadedFiles.length})
                  </h3>
                  <div className='space-y-2'>
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className='flex items-center justify-between rounded-lg border bg-gray-50 p-4'
                      >
                        <div className='flex items-center space-x-3'>
                          <FileText className='h-5 w-5 text-red-600' />
                          <div>
                            <p className='font-medium text-gray-900'>
                              {file.name}
                            </p>
                            <p className='text-sm text-gray-500'>
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          onClick={() => removeFile(file.id)}
                          className='cursor-pointer rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
      {/* Action Buttons */}
      <Card>
        <CardContent>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex flex-col gap-2'>
              <h2 className='text-lg font-bold'>Ready to Submit</h2>
              <p className='text-sm text-gray-500'>
                Review your information and submit your case filing.
              </p>
            </div>
            <div className='flex items-center gap-3 pt-4'>
              <Button
                variant='outline'
                type='button'
                className='cursor-pointer px-6'
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                variant='default'
                className='cursor-pointer px-6'
                disabled={createLoading}
              >
                {createLoading ? 'Submitting...' : 'Submit Case Filing'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
