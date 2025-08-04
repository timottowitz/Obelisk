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
import { useRouter } from 'next/navigation';
import dyajs from 'dayjs';
import { useCasesOperations } from '@/hooks/useCases';
import { toast } from 'sonner';

export function CaseForm({ initialData }: { initialData?: any }) {
  const { caseTypes: caseTypesData } = useCasesOperations();
  const caseTypes = caseTypesData.data || [];
  const caseTypesLoading = caseTypesData.isLoading;

  const [formData, setFormData] = useState<{
    full_name: string;
    phone: string;
    email: string;
    case_type_id: string;
    special_notes: string;
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
  }>({
    full_name: initialData?.full_name || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    case_type_id: initialData?.case_type || '',
    special_notes: initialData?.special_notes || '',
    filing_fee: initialData?.filing_fee || '',
    case_number: initialData?.case_number || '',
    claimant: initialData?.claimant || '',
    respondent: initialData?.respondent || '',
    case_manager: initialData?.case_manager || '',
    adr_process: initialData?.adr_process || '',
    applicable_rules: initialData?.applicable_rules || '',
    track: initialData?.track || '',
    claim_amount: initialData?.claim_amount || '',
    hearing_locale: initialData?.hearing_locale || ''
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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
      const type = caseTypes.find(
        (type) => type.id === formData.case_type_id
      )?.display_name.toLowerCase();
      toast.success(`Case ${initialData ? 'updated' : 'created'} successfully`);
      router.push(`/dashboard/cases?type=${type}`);
    } catch (error) {
      toast.error(`Case ${initialData ? 'update' : 'creation'} failed`);
    } finally {
      setCreateLoading(false);
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
          <div className='flex flex-row justify-between gap-4'>
            {/* Claimant */}
            <div className='space-y-2'>
              <Label htmlFor='claimant'>Claimant</Label>
              <Input
                id='claimant'
                value={formData.claimant}
                onChange={(e) => handleInputChange('claimant', e.target.value)}
                placeholder='Enter claimant name'
              />
            </div>

            {/* Respondent */}
            <div className='space-y-2'>
              <Label htmlFor='respondent'>Respondent</Label>
              <Input
                id='respondent'
                value={formData.respondent}
                onChange={(e) =>
                  handleInputChange('respondent', e.target.value)
                }
                placeholder='Enter respondent name'
              />
            </div>

            {/* Case Manager */}
            <div className='space-y-2'>
              <Label htmlFor='case_manager'>Case Manager</Label>
              <Input
                id='case_manager'
                value={formData.case_manager}
                onChange={(e) =>
                  handleInputChange('case_manager', e.target.value)
                }
                placeholder='Enter case manager name'
              />
            </div>
          </div>
          <div className='flex flex-row justify-between gap-4'>
            {/* ADR Process */}
            <div className='space-y-2'>
              <Label htmlFor='adr_process'>ADR Process</Label>
              <Input
                id='adr_process'
                value={formData.adr_process}
                onChange={(e) =>
                  handleInputChange('adr_process', e.target.value)
                }
                placeholder='Enter ADR process'
              />
            </div>

            {/* Applicable Rules */}
            <div className='space-y-2'>
              <Label htmlFor='applicable_rules'>Applicable Rules</Label>
              <Input
                id='applicable_rules'
                value={formData.applicable_rules}
                onChange={(e) =>
                  handleInputChange('applicable_rules', e.target.value)
                }
                placeholder='Enter applicable rules'
              />
            </div>

            {/* Track */}
            <div className='space-y-2'>
              <Label htmlFor='track'>Track</Label>
              <Input
                id='track'
                value={formData.track}
                onChange={(e) => handleInputChange('track', e.target.value)}
                placeholder='Enter track'
              />
            </div>

            {/* Claim Amount */}
            <div className='space-y-2'>
              <Label htmlFor='claim_amount'>Claim Amount</Label>
              <Input
                id='claim_amount'
                value={formData.claim_amount}
                onChange={(e) =>
                  handleInputChange('claim_amount', e.target.value)
                }
                placeholder='Enter claim amount'
              />
            </div>

            {/* Hearing Locale */}
            <div className='space-y-2'>
              <Label htmlFor='hearing_locale'>Hearing Locale</Label>
              <Input
                id='hearing_locale'
                value={formData.hearing_locale}
                onChange={(e) =>
                  handleInputChange('hearing_locale', e.target.value)
                }
                placeholder='Enter hearing locale'
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex justify-end gap-3 pt-4'>
            <Button
              variant='outline'
              className='px-6'
              onClick={() => router.push('/dashboard/cases')}
            >
              Cancel
            </Button>
            <Button
              type='submit'
              className='bg-red-600 px-6 hover:bg-red-700'
              disabled={createLoading}
            >
              {createLoading ? 'Loading...' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
