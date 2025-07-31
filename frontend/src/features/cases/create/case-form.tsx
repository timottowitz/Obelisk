'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/card';
import { UploadIcon, CircleAlertIcon, Loader2 } from 'lucide-react';
import dyajs from 'dayjs';
import { useCasesOperations } from '@/hooks/useCases';

export function CaseForm({
  caseTypes,
  isLoading
}: {
  caseTypes: any[];
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<{
    full_name: string;
    phone: string;
    email: string;
    case_type_id: string;
    special_notes: string;
    filing_fee: string;
    case_number: string;
  }>({
    full_name: '',
    phone: '',
    email: '',
    case_type_id: '',
    special_notes: '',
    filing_fee: '',
    case_number: ''
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { createCase } = useCasesOperations();

  // Set default case type ID when case types are loaded
  useEffect(() => {
    if (caseTypes.length > 0 && !formData.case_type_id) {
      setFormData((prev) => ({
        ...prev,
        case_type_id: caseTypes[0].id
      }));
    }
  }, [caseTypes]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const case_number =
      dyajs().format('DD-MM') +
      '-' +
      Math.floor(10000000 + Math.random() * 90000000)
        .toString()
        .replace(/(\d{4})(\d{4})/, '$1-$2');

    try {
      const response = await createCase.mutateAsync({
        ...formData,
        case_number
      });
      if (response) {
        console.log('Case created successfully:', response);
      }
    } catch (error) {
      console.error('Case creation failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <Card>
        <CardContent className='space-y-6'>
          {/* Provide Details Section */}
          <div>
            <h3 className='mb-4 text-lg font-medium'>Provide Details</h3>

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

              {/* Case Type */}
              <div className='space-y-2'>
                <Label htmlFor='case_type_id'>
                  Case Type <span className='text-red-500'>*</span>
                </Label>
                {!isLoading && caseTypes.length > 0 ? (
                  <Select
                    defaultValue={caseTypes[0].id}
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
                            {type.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <Loader2 className='h-3 w-3 animate-spin' />
                )}
              </div>
            </div>
          </div>

          {/* Special Notes */}
          <div className='space-y-2'>
            <Label htmlFor='special_notes'>Special Notes</Label>
            <Textarea
              id='special_notes'
              value={formData.special_notes}
              onChange={(e) =>
                handleInputChange('special_notes', e.target.value)
              }
              placeholder='Enter any special notes or instructions'
              rows={4}
            />
            <div className='flex items-center gap-1 text-sm text-blue-600'>
              <CircleAlertIcon className='h-4 w-4' />
              <span>
                Use this section to provide any specific instructions related to
                your case.
              </span>
            </div>
          </div>

          {/* Filing Fee */}
          <div className='space-y-2'>
            <Label htmlFor='filing_fee'>
              Enter Filing Fee (to be charged){' '}
              <span className='text-red-500'>*</span>
            </Label>
            <Input
              id='filing_fee'
              type='number'
              value={formData.filing_fee}
              onChange={(e) => handleInputChange('filing_fee', e.target.value)}
              placeholder='0.00'
              step='0.01'
            />
            <div className='flex items-center gap-1 text-sm text-blue-600'>
              <CircleAlertIcon className='h-4 w-4' />
              <span>Enter $0.00 if fee is unknown.</span>
            </div>
          </div>

          {/* Upload Filing Documents */}
          <div className='space-y-4'>
            <div className='flex gap-2'>
              <Label>
                Upload Filing Documents
                <span className='text-red-500'>*</span>
              </Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => document.getElementById('fileUpload')?.click()}
              >
                <UploadIcon className='mr-2 h-4 w-4' />
                Upload
              </Button>
              <input
                id='fileUpload'
                type='file'
                multiple
                className='hidden'
                onChange={handleFileUpload}
                accept='.pdf,.doc,.docx,.txt'
              />
            </div>

            {/* File Upload Table */}
            <div className='rounded-lg border'>
              <div className='grid grid-cols-3 gap-4 border-b bg-gray-50 p-3 text-sm font-medium'>
                <span>File Name</span>
                <span>Description</span>
                <span>Action</span>
              </div>
              <div className='p-4'>
                {uploadedFiles.length === 0 ? (
                  <p className='text-sm text-gray-500'>No data to display.</p>
                ) : (
                  <div className='space-y-2'>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className='grid grid-cols-3 items-center gap-4 py-2'
                      >
                        <span className='text-sm'>{file.name}</span>
                        <span className='text-sm text-gray-500'>
                          Uploaded document
                        </span>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => handleRemoveFile(index)}
                          className='text-red-600 hover:text-red-700'
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 pt-4'>
            <Button variant='outline' className='px-6'>
              Cancel
            </Button>
            <Button type='submit' className='bg-red-600 px-6 hover:bg-red-700'>
              Create
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
