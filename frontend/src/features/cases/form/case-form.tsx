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
import { Loader2, ArrowLeft, Upload, FileText, X, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dyajs from 'dayjs';
import { useCasesOperations } from '@/hooks/useCases';
import { toast } from 'sonner';
import Link from 'next/link';
import { v1 as uuidv1 } from 'uuid';
import { useContactTypes, useContactsBySearch } from '@/hooks/useContacts';
import { useDebounce } from '@/hooks/use-debounce';
import { Contact } from '@/types/contacts';
import ContactModal from '@/features/contacts/components/contact-modal';
import { useCreateContact } from '@/hooks/useContacts';

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
  const { data: contactTypes, isLoading: contactTypesLoading } =
    useContactTypes();
  const [formData, setFormData] = useState<{
    full_name: string;
    phone: string;
    email: string;
    case_type_id: string;
    special_instructions: string;
    filing_fee: string;
    case_number: string;
    claimant: string;
    claimant_id: string;
    respondent: string;
    respondent_id: string;
    case_manager: string;
    adr_process: string;
    applicable_rules: string;
    track: string;
    claim_amount: string;
    hearing_locale: string;
    access: string;
    next_event: string;
    initial_task: string;
    documents: {
      id: string;
      name: string;
      size: number;
      type: string;
      file: File;
    }[];
  }>({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    case_type_id: initialData?.case_type || '',
    special_instructions: initialData?.special_instructions || '',
    filing_fee: initialData?.filing_fee || '',
    case_number: initialData?.case_number || '',
    claimant: initialData?.claimant || '',
    claimant_id: initialData?.claimant_id || '',
    respondent: initialData?.respondent || '',
    respondent_id: initialData?.respondent_id || '',
    case_manager: initialData?.case_manager || '',
    adr_process: initialData?.adr_process || '',
    applicable_rules: initialData?.applicable_rules || '',
    track: initialData?.track || '',
    claim_amount: initialData?.claim_amount || '',
    hearing_locale: initialData?.hearing_locale || '',
    access: initialData?.access || 'admin_only',
    next_event: initialData?.next_event || null,
    initial_task: initialData?.initial_task || '',
    documents: initialData?.documents || []
  });

  const { createCase, updateCase } = useCasesOperations();
  const router = useRouter();
  const [createLoading, setCreateLoading] = useState(false);
  const [claimantSearch, setClaimantSearch] = useState('');
  const [respondentSearch, setRespondentSearch] = useState('');
  const debouncedClaimantSearch = useDebounce(claimantSearch, 500);
  const debouncedRespondentSearch = useDebounce(respondentSearch, 500);
  const [showClaimant, setShowClaimant] = useState(false);
  const [showRespondent, setShowRespondent] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const { data: claimantContacts, isLoading: claimantLoading } =
    useContactsBySearch(debouncedClaimantSearch);
  const { data: respondentContacts, isLoading: respondentLoading } =
    useContactsBySearch(debouncedRespondentSearch);
  const createContact = useCreateContact();
  const [openContactModal, setOpenContactModal] = useState(false);
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

  const handleCreateContact = useCallback(
    async (formData: any) => {
      try {
        await createContact.mutateAsync(formData);
        toast.success('Contact created successfully');
        setOpenContactModal(false);
      } catch (error) {
        console.error('Error creating contact:', error);
        toast.error('Error creating contact');
      }
    },
    [createContact]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, field: 'claimant' | 'respondent') => {
      const isClaimant = field === 'claimant';
      const isOpen = isClaimant ? showClaimant : showRespondent;
      const contacts = isClaimant ? claimantContacts : respondentContacts;
      const filteredContacts = contacts?.slice(0, 10) || [];

      if (!isOpen || !filteredContacts.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredContacts.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredContacts.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredContacts.length) {
            const contact = filteredContacts[selectedIndex];
            handleInputChange(field, contact.full_name);
            if (isClaimant) {
              setShowClaimant(false);
              setClaimantSearch('');
            } else {
              setShowRespondent(false);
              setRespondentSearch('');
            }
            setSelectedIndex(-1);
          }
          break;
        case 'Escape':
          if (isClaimant) {
            setShowClaimant(false);
            setClaimantSearch('');
          } else {
            setShowRespondent(false);
            setRespondentSearch('');
          }
          setSelectedIndex(-1);
          break;
      }
    },
    [
      claimantContacts,
      respondentContacts,
      showClaimant,
      showRespondent,
      selectedIndex,
      handleInputChange
    ]
  );

  const handleContactSelect = useCallback(
    (field: 'claimant' | 'respondent', contact: Contact) => {
      handleInputChange(field, contact.full_name);
      if (field === 'claimant') {
        setShowClaimant(false);
        setClaimantSearch('');
        setFormData((prev) => ({
          ...prev,
          claimant_id: contact.id
        }));
      } else {
        setShowRespondent(false);
        setRespondentSearch('');
        setFormData((prev) => ({
          ...prev,
          respondent_id: contact.id
        }));
      }
      setSelectedIndex(-1);
    },
    [handleInputChange]
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;

      //check file size and type
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
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
        setFormData((prev) => ({
          ...prev,
          documents: [...prev.documents, ...newFiles]
        }));
      }
    },
    [setFormData]
  );

  const removeFile = useCallback((fileId: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((file) => file.id !== fileId)
    }));
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
        // Create FormData object to handle file uploads
        const submitData = new FormData();

        // Add all text fields to FormData
        submitData.append('full_name', formData.full_name);
        submitData.append('phone', formData.phone);
        submitData.append('email', formData.email);
        submitData.append('case_type_id', formData.case_type_id);
        submitData.append(
          'special_instructions',
          formData.special_instructions
        );
        submitData.append('filing_fee', formData.filing_fee);
        submitData.append('case_number', formData.case_number || case_number);
        submitData.append('claimant', formData.claimant);
        submitData.append('claimant_id', formData.claimant_id);
        submitData.append('respondent', formData.respondent);
        submitData.append('respondent_id', formData.respondent_id);
        submitData.append('case_manager', formData.case_manager);
        submitData.append('adr_process', formData.adr_process);
        submitData.append('applicable_rules', formData.applicable_rules);
        submitData.append('track', formData.track);
        submitData.append('claim_amount', formData.claim_amount);
        submitData.append('hearing_locale', formData.hearing_locale);
        submitData.append('access', formData.access);
        submitData.append('next_event', formData.next_event);
        submitData.append('initial_task', formData.initial_task);

        // Add files to FormData
        formData.documents.forEach((doc, index) => {
          submitData.append(`documents`, doc.file);
        });

        if (initialData) {
          await updateCase.mutateAsync({
            caseId: initialData.id,
            formData: submitData
          });
        } else {
          await createCase.mutateAsync(submitData);
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
              <div className='relative space-y-2'>
                <Label htmlFor='claimant'>
                  Claimant<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='claimant'
                  required
                  value={showClaimant ? claimantSearch : formData.claimant}
                  onChange={(e) => {
                    setClaimantSearch(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'claimant')}
                  onFocus={() => {
                    setShowClaimant(true);
                    setClaimantSearch(formData.claimant);
                    setSelectedIndex(-1);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setShowClaimant(false);
                      setClaimantSearch('');
                      setSelectedIndex(-1);
                    }, 200)
                  }
                  placeholder='Search and select a contact'
                  autoComplete='off'
                />
                {showClaimant && (
                  <div className='bg-background absolute z-50 -mt-2 w-full rounded-md border shadow-lg'>
                    {claimantLoading ? (
                      <div className='text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm'>
                        <Loader2 className='h-3 w-3 animate-spin' />
                        Searching contacts...
                      </div>
                    ) : claimantContacts && claimantContacts.length > 0 ? (
                      <div className='max-h-60 overflow-auto py-1'>
                        <div
                          className='flex cursor-pointer items-center gap-2 border-b border-gray-200 px-3 py-3 text-sm'
                          onClick={() => setOpenContactModal(true)}
                        >
                          <Plus className='h-4 w-4' />
                          Add New Contact
                        </div>
                        {claimantContacts.map((contact, index) => (
                          <div
                            key={contact.id}
                            className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                              index === selectedIndex
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            }`}
                            onClick={() =>
                              handleContactSelect('claimant', contact)
                            }
                          >
                            <div className='font-medium'>
                              {contact.full_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : claimantSearch.length > 0 ? (
                      <div className='text-muted-foreground px-3 py-3 text-sm'>
                        No contacts found for {claimantSearch}
                      </div>
                    ) : (
                      <div className='text-muted-foreground px-3 py-3 text-sm'>
                        Start typing to search contacts
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <div className='relative space-y-2'>
                <Label htmlFor='respondent'>
                  Respondent<span className='text-red-500'>*</span>
                </Label>
                <Input
                  id='respondent'
                  required
                  value={
                    showRespondent ? respondentSearch : formData.respondent
                  }
                  onChange={(e) => {
                    setRespondentSearch(e.target.value);
                    setSelectedIndex(-1);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'respondent')}
                  onFocus={() => {
                    setShowRespondent(true);
                    setRespondentSearch(formData.respondent);
                    setSelectedIndex(-1);
                  }}
                  onBlur={() =>
                    setTimeout(() => {
                      setShowRespondent(false);
                      setRespondentSearch('');
                      setSelectedIndex(-1);
                    }, 200)
                  }
                  placeholder='Search and select a contact'
                  autoComplete='off'
                />
                {showRespondent && (
                  <div className='bg-background absolute z-50 -mt-2 w-full rounded-md border shadow-lg'>
                    <div
                      className='flex cursor-pointer items-center gap-2 border-b border-gray-200 px-3 py-3 text-sm'
                      onClick={() => setOpenContactModal(true)}
                    >
                      <Plus className='h-4 w-4' />
                      Add New Contact
                    </div>
                    {respondentLoading ? (
                      <div className='text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm'>
                        <Loader2 className='h-3 w-3 animate-spin' />
                        Searching contacts...
                      </div>
                    ) : respondentContacts && respondentContacts.length > 0 ? (
                      <div className='max-h-60 overflow-auto py-1'>
                        {respondentContacts.map((contact, index) => (
                          <div
                            key={contact.id}
                            className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                              index === selectedIndex
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/50'
                            }`}
                            onClick={() =>
                              handleContactSelect('respondent', contact)
                            }
                          >
                            <div className='font-medium'>
                              {contact.full_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : respondentSearch.length > 0 ? (
                      <div className='text-muted-foreground px-3 py-3 text-sm'>
                        No contacts found for {respondentSearch}
                      </div>
                    ) : (
                      <div className='text-muted-foreground px-3 py-3 text-sm'>
                        Start typing to search contacts
                      </div>
                    )}
                  </div>
                )}
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
                  required
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

              {formData.documents.length > 0 && (
                <div className='space-y-3'>
                  <h3 className='font-medium text-gray-900'>
                    Uploaded Documents ({formData.documents.length})
                  </h3>
                  <div className='space-y-2'>
                    {formData.documents.map((file) => (
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
      </form>
      <ContactModal
        open={openContactModal}
        onOpenChange={setOpenContactModal}
        onCreate={handleCreateContact}
        availableTypes={contactTypes || []}
        selectedContact={null}
      />
    </>
  );
}
