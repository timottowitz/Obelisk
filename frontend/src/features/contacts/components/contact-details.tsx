import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import ContactAvatar from './contact-avatar';
import { phoneTypeIcon, phoneTypeToLabel } from './phone-display';
import { Contact, PhoneEntry, PhoneType } from '@/types/contacts';

const getPhones = (c: Contact): PhoneEntry[] => {
  if (c.phones && c.phones.length) {
    return c.phones.map((p) => ({
      type: p.phoneLabel as PhoneType,
      value: p.number
    }));
  }
  return [];
};

export default function ContactDetails({
  contact
}: {
  contact: Contact | null;
}) {
  return (
    <div className='md:col-span-3'>
      <div className='bg-card rounded-lg border-2'>
        <div className='border-b p-4'>
          <div className='text-sm font-medium'>Contact Details</div>
        </div>
        <ScrollArea className='max-h-[calc(100dvh-180px)]'>
          {!contact && (
            <div className='space-y-6 p-6'>
              <div className='flex flex-col items-center gap-4'>
                <ContactAvatar name='Contact' size='lg' />
                <div>
                  <div className='text-foreground text-xl font-semibold'>
                    Select a contact to view details
                  </div>
                </div>
              </div>
            </div>
          )}
          {contact && (
            <div className='space-y-6 p-6'>
              <div className='flex flex-col items-center gap-4'>
                <ContactAvatar name={contact.full_name} size='lg' />
                <div>
                  <div className='text-foreground text-xl font-semibold'>
                    {contact.full_name}
                  </div>
                  <div className='mt-2 flex flex-wrap justify-center gap-2'>
                    <Badge
                      variant='outline'
                      className='border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                    >
                      {contact.contact_type}
                    </Badge>
                  </div>
                  {contact.flattened_hash_tags && contact.flattened_hash_tags.split(',').length ? (
                    <div className='mt-2 flex flex-wrap justify-center gap-1'>
                      {contact.flattened_hash_tags.split(',').map((t) => (
                        <Badge
                          key={t}
                          variant='secondary'
                          className='bg-muted/60'
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <Icons.call className='text-muted-foreground mt-0.5 h-4 w-4' />
                  <div className='text-sm'>
                    <div className='text-muted-foreground'>Phone</div>
                    <div className='text-sky-700 dark:text-sky-400'>
                      {(() => {
                        const phones = getPhones(contact);
                        return phones.length ? (
                          <ul className='space-y-2'>
                            {phones.map((p, i) => (
                              <li
                                key={`${p.value}-${i}`}
                                className='flex items-center gap-2'
                              >
                                {phoneTypeIcon(p.type)}
                                <span className='text-foreground font-medium'>
                                  {phoneTypeToLabel[p.type]}
                                </span>
                                <span>{p.value}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Icons.mail className='text-muted-foreground mt-0.5 h-4 w-4' />
                  <div className='text-sm'>
                    <div className='text-muted-foreground'>Email</div>
                    {contact.emails.map((e) => (
                      <div
                        key={e.address}
                        className='truncate whitespace-nowrap'
                      >
                        {e.address}
                      </div>
                    ))}
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Icons.location className='text-muted-foreground mt-0.5 h-4 w-4' />
                  <div className='text-sm'>
                    <div className='text-muted-foreground'>Address</div>
                    <div className='text-foreground'>
                      {contact.addresses.map((a, _index) => (
                        <div key={_index}>
                          {a.street}
                          {a.street2 && ` ${a.street2}`}
                          {a.city && ` ${a.city}`}
                          {a.st && ` ${a.st}`}
                          {a.zip && ` ${a.zip}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
