'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  MapPin,
  Mail,
  Phone,
  Plus,
  Trash2,
  User2,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Contact, ContactType } from '@/types/contacts';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: FormData) => void;
  onUpdate: (contactId: string, payload: FormData) => void;
  availableTypes: ContactType[];
  selectedContact: Contact | null;
}

// Local list row types
type PhoneRow = { id: string; type: string; number: string };
type EmailRow = { id: string; type: string; email: string };
type AddressRow = {
  id: string;
  street?: string;
  street2?: string;
  city?: string;
  st?: string;
  zip?: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);

type ContactFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  company_name: string;
  prefix: string;
  suffix: string;
  nickname: string;
  company: string;
  department: string;
  jobTitle: string;
  phones: PhoneRow[];
  emails: EmailRow[];
  addresses: AddressRow[];
  contactTypeId: string;
  tags: string[];
};

export default function ContactModal({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  availableTypes,
  selectedContact
}: ContactModalProps) {
  const [activeTab, setActiveTab] = useState<'person' | 'company'>('person');
  const [form, setForm] = useState<ContactFormState>({
    firstName: '',
    middleName: '',
    lastName: '',
    company_name: '',
    prefix: '',
    suffix: '',
    nickname: '',
    company: '',
    department: '',
    jobTitle: '',
    contactTypeId: '',
    phones: [{ id: uid(), type: 'phone', number: '' }],
    emails: [{ id: uid(), type: 'email', email: '' }],
    addresses: [
      { id: uid(), street: '', street2: '', city: '', st: '', zip: '' }
    ],
    tags: []
  });

  useEffect(() => {
    if (selectedContact) {
      setForm((f) => ({
        ...f,
        firstName: selectedContact.name.split(' ')[0],
        middleName:
          selectedContact.name.split(' ').length > 2
            ? selectedContact.name.split(' ')[1]
            : '',
        lastName:
          selectedContact.name.split(' ').length > 2
            ? selectedContact.name.split(' ')[2]
            : selectedContact.name.split(' ')[1],
        prefix: selectedContact.prefix ?? '',
        suffix: selectedContact.suffix ?? '',
        nickname: selectedContact.nickname ?? '',
        company: selectedContact.company ?? '',
        department: selectedContact.department ?? '',
        jobTitle: selectedContact.job_title ?? '',
        contactTypeId: selectedContact.contact_type_id ?? '',
        phones: selectedContact.phone.map((p) => ({
          id: uid(),
          type: p.type,
          number: p.number
        })),
        emails: selectedContact.email.map((e) => ({
          id: uid(),
          type: e.type,
          email: e.email
        })),
        addresses: selectedContact.address.map((a) => ({
          id: uid(),
          street: a.street,
          street2: a.street2,
          city: a.city,
          st: a.st,
          zip: a.zip
        }))
      }));
    }
    if (availableTypes.length > 0 && !selectedContact) {
      setForm((f) => ({ ...f, contactTypeId: availableTypes[0].id }));
    }
  }, [availableTypes, selectedContact]);

  const {
    firstName,
    middleName,
    lastName,
    company_name,
    prefix,
    suffix,
    nickname,
    company,
    department,
    jobTitle,
    phones,
    emails,
    addresses
  } = form;

  // Derived display name
  const fullName = useMemo(
    () => [firstName, middleName, lastName].filter(Boolean).join(' ').trim(),
    [firstName, middleName, lastName]
  );

  const canCreate = (fullName || company).trim().length > 0;

  // List mutators
  const addPhone = () =>
    setForm((f) => ({
      ...f,
      phones: [...f.phones, { id: uid(), type: 'phone', number: '' }]
    }));
  const removePhone = (id: string) =>
    setForm((f) => ({ ...f, phones: f.phones.filter((r) => r.id !== id) }));

  const addEmail = () =>
    setForm((f) => ({
      ...f,
      emails: [...f.emails, { id: uid(), type: 'email', email: '' }]
    }));
  const removeEmail = (id: string) =>
    setForm((f) => ({ ...f, emails: f.emails.filter((r) => r.id !== id) }));

  const addAddress = () =>
    setForm((f) => ({
      ...f,
      addresses: [
        ...f.addresses,
        { id: uid(), street: '', street2: '', city: '', st: '', zip: '' }
      ]
    }));
  const removeAddress = (id: string) =>
    setForm((f) => ({
      ...f,
      addresses: f.addresses.filter((r) => r.id !== id)
    }));

  const submit = () => {
    const formData = new FormData();
    formData.append('name', fullName || company_name);
    formData.append('prefix', prefix);
    formData.append('suffix', suffix);
    formData.append('nickname', nickname);
    formData.append('company', company);
    formData.append('department', department);
    formData.append('job_title', jobTitle);
    formData.append('contact_type_id', form.contactTypeId);
    formData.append(
      'phone',
      JSON.stringify(
        phones
          .filter(({ number }) => number.trim() !== '')
          .map(({ type, number }) => ({ type, number }))
      )
    );
    formData.append(
      'email',
      JSON.stringify(
        emails
          .filter(({ email }) => email.trim() !== '')
          .map(({ type, email }) => ({ type, email }))
      )
    );
    formData.append(
      'address',
      JSON.stringify(
        addresses
          .filter(({ street, street2, city, st, zip }) => {
            return (
              street?.trim() !== '' ||
              street2?.trim() !== '' ||
              city?.trim() !== '' ||
              st?.trim() !== '' ||
              zip?.trim() !== ''
            );
          })
          .map(({ street, street2, city, st, zip }) => ({
            street,
            street2,
            city,
            st,
            zip
          }))
      )
    );
    if (selectedContact) {
      onUpdate(selectedContact.id, formData);
    } else {
      onCreate(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='bg-card h-[80vh] w-full !max-w-7xl overflow-y-auto border-2 p-4'>
        <div className='bg-muted/20 flex items-center justify-between px-6 py-4'>
          <DialogHeader>
            <DialogTitle className='text-foreground text-xl font-semibold'>
              New Contact
            </DialogTitle>
            <div className='flex items-center gap-2'>
              <Label className='text-muted-foreground w-48'>
                Contact Type:
              </Label>
              <Select
                value={form.contactTypeId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, contactTypeId: value }))
                }
              >
                <SelectTrigger className='bg-card'>
                  <SelectValue placeholder='Select Contact Type' />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className='text-muted-foreground'>Tags:</Label>
              <Input
                className='bg-card'
                value={form.tags.join(',')}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    tags: e.target.value.split(',').map((t) => t.trim())
                  }))
                }
              />
            </div>
          </DialogHeader>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='cursor-pointer'
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!canCreate}
              className='cursor-pointer'
            >
              {selectedContact ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        <div className='px-6 pt-2 pb-6'>
          {/* Breadcrumb-like section tag */}
          <div className='mb-4'>
            <Button size='sm' variant='destructive'>
              Contact Info
            </Button>
          </div>

          {/* Top row: avatar/icons + identity fields to mirror a dashboard layout */}
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            <div className='lg:col-span-2'>
              <div className='flex items-center justify-center gap-3'>
                <div className='bg-card flex h-24 w-24 items-center justify-center rounded-full border'>
                  <User2 className='text-muted-foreground h-8 w-8' />
                </div>
              </div>
            </div>

            <div className='lg:col-span-10'>
              <div className='flex items-end gap-3'>
                <div className='mb-2 hidden items-center justify-center gap-2 md:flex'>
                  <User2
                    className={cn(
                      'h-8 w-8',
                      activeTab === 'person' && 'border-2 border-blue-500'
                    )}
                    onClick={() => setActiveTab('person')}
                  />
                  <Building2
                    className={cn(
                      'h-8 w-8',
                      activeTab === 'company' && 'border-2 border-blue-500'
                    )}
                    onClick={() => setActiveTab('company')}
                  />
                </div>
                <div className='flex-1'>
                  <Label className='text-muted-foreground'>
                    {activeTab === 'person' ? 'First Name' : 'Company Name'}
                  </Label>
                  <Input
                    className='bg-card'
                    value={activeTab === 'person' ? firstName : company_name}
                    onChange={(e) =>
                      setForm((f) =>
                        activeTab === 'person'
                          ? { ...f, firstName: e.target.value }
                          : { ...f, company_name: e.target.value }
                      )
                    }
                    required
                  />
                </div>
                {activeTab === 'company' && (
                  <div className='w-64'>
                    <Label className='text-muted-foreground'>Nickname</Label>
                    <Input
                      className='bg-card'
                      value={nickname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nickname: e.target.value }))
                      }
                    />
                  </div>
                )}
                {activeTab === 'person' && (
                  <>
                    <div className='flex-1'>
                      <Label className='text-muted-foreground'>
                        Middle Name
                      </Label>
                      <Input
                        className='bg-card'
                        value={middleName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, middleName: e.target.value }))
                        }
                      />
                    </div>
                    <div className='flex-1'>
                      <Label className='text-muted-foreground'>Last Name</Label>
                      <Input
                        className='bg-card'
                        value={lastName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, lastName: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              {activeTab === 'person' && (
                <div className='mt-4 flex items-start gap-3'>
                  <div className='w-24'>
                    <Label className='text-muted-foreground'>Prefix</Label>
                    <Input
                      className='bg-card'
                      value={prefix}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, prefix: e.target.value }))
                      }
                    />
                  </div>
                  <div className='w-24'>
                    <Label className='text-muted-foreground'>Suffix</Label>
                    <Input
                      className='bg-card'
                      value={suffix}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, suffix: e.target.value }))
                      }
                    />
                  </div>
                  <div className='w-64'>
                    <Label className='text-muted-foreground'>Nickname</Label>
                    <Input
                      className='bg-card'
                      value={nickname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nickname: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}

              {activeTab === 'person' && (
                <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div>
                    <Label className='text-muted-foreground'>Company</Label>
                    <Input
                      className='bg-card'
                      value={company}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, company: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>Department</Label>
                    <Input
                      className='bg-card'
                      value={department}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, department: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>Job Title</Label>
                    <Input
                      className='bg-card'
                      value={jobTitle}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, jobTitle: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='my-4'>
            <Separator />
          </div>

          {/* Two-column: Phone and Email */}
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-12'>
            {/* Phone */}
            <div className='lg:col-span-6'>
              <div className='text-foreground mb-2 text-sm font-medium'>
                Phone
              </div>
              {phones.map((row) => (
                <div
                  key={row.id}
                  className='bg-muted/20 mb-2 flex items-center gap-2 rounded-md p-2'
                >
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => removePhone(row.id)}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </Button>
                  <Select
                    value={row.type}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        phones: f.phones.map((r) =>
                          r.id === row.id ? { ...r, type: v } : r
                        )
                      }))
                    }
                  >
                    <SelectTrigger className='bg-card w-32'>
                      <SelectValue placeholder='Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='phone'>Phone</SelectItem>
                      <SelectItem value='mobile'>Mobile</SelectItem>
                      <SelectItem value='fax'>Fax</SelectItem>
                      <SelectItem value='main'>Main</SelectItem>
                      <SelectItem value='work'>Work</SelectItem>
                      <SelectItem value='home'>Home</SelectItem>
                      <SelectItem value='other'>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className='bg-card flex-1'
                    placeholder='Phone Number'
                    value={row.number}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        phones: f.phones.map((r) =>
                          r.id === row.id ? { ...r, number: e.target.value } : r
                        )
                      }))
                    }
                  />
                  <Button size='icon' variant='secondary'>
                    <Phone className='h-4 w-4' />
                  </Button>
                </div>
              ))}
              <Button
                size='sm'
                variant='ghost'
                onClick={addPhone}
                className='mt-1 text-green-500'
              >
                <Plus className='mr-1 h-4 w-4' /> Add Phone
              </Button>
            </div>

            {/* Email */}
            <div className='lg:col-span-6'>
              <div className='text-foreground mb-2 text-sm font-medium'>
                Email
              </div>
              {emails.map((row) => (
                <div
                  key={row.id}
                  className='bg-muted/20 mb-2 flex items-center gap-2 rounded-md p-2'
                >
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => removeEmail(row.id)}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </Button>
                  <Select
                    value={row.type}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        emails: f.emails.map((r) =>
                          r.id === row.id ? { ...r, type: v } : r
                        )
                      }))
                    }
                  >
                    <SelectTrigger className='bg-card w-32'>
                      <SelectValue placeholder='Type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='email'>Email</SelectItem>
                      <SelectItem value='work'>Work</SelectItem>
                      <SelectItem value='home'>Home</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className='bg-card flex-1'
                    placeholder='Email Address'
                    value={row.email}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        emails: f.emails.map((r) =>
                          r.id === row.id ? { ...r, email: e.target.value } : r
                        )
                      }))
                    }
                  />
                  <Button size='icon' variant='secondary'>
                    <Mail className='h-4 w-4' />
                  </Button>
                </div>
              ))}
              <Button
                size='sm'
                variant='ghost'
                onClick={addEmail}
                className='mt-1 text-green-500'
              >
                <Plus className='mr-1 h-4 w-4' /> Add Email
              </Button>
            </div>
          </div>

          <div className='my-4'>
            <Separator />
          </div>

          {/* Address */}
          <div className='lg:col-span-12'>
            <div className='text-foreground mb-2 text-sm font-medium'>
              Address
            </div>
            {addresses.map((row) => (
              <div key={row.id} className='bg-muted/20 mb-3 rounded-md p-3'>
                <div className='mb-2 flex items-center justify-between'>
                  <div className='text-muted-foreground flex items-center gap-2'>
                    <MapPin className='h-4 w-4' /> Address
                  </div>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => removeAddress(row.id)}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </Button>
                </div>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
                  <div>
                    <Label className='text-muted-foreground'>Street</Label>
                    <Input
                      className='bg-card'
                      value={row.street ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          addresses: f.addresses.map((x) =>
                            x.id === row.id
                              ? { ...x, street: e.target.value }
                              : x
                          )
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>Street 2</Label>
                    <Input
                      className='bg-card'
                      value={row.street2 ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          addresses: f.addresses.map((x) =>
                            x.id === row.id
                              ? { ...x, street2: e.target.value }
                              : x
                          )
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>City</Label>
                    <Input
                      className='bg-card'
                      value={row.city ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          addresses: f.addresses.map((x) =>
                            x.id === row.id ? { ...x, city: e.target.value } : x
                          )
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>ST</Label>
                    <Input
                      className='bg-card'
                      value={row.st ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          addresses: f.addresses.map((x) =>
                            x.id === row.id ? { ...x, st: e.target.value } : x
                          )
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label className='text-muted-foreground'>Zip</Label>
                    <Input
                      className='bg-card'
                      value={row.zip ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          addresses: f.addresses.map((x) =>
                            x.id === row.id ? { ...x, zip: e.target.value } : x
                          )
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              size='sm'
              variant='ghost'
              onClick={addAddress}
              className='mt-1 text-green-500'
            >
              <Plus className='mr-1 h-4 w-4' /> Add Address
            </Button>
          </div>
        </div>

        <DialogFooter className='hidden' />
      </DialogContent>
    </Dialog>
  );
}
