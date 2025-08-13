export type Contact = {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  full_name: string;
  prefix?: string;
  suffix?: string;
  is_archived: boolean;
  addresses: {
    street: string;
    street2: string;
    city: string;
    st: string;
    zip: string;
  }[];
  emails: {
    notes: string;
    emailLabel: string;
    address: string;
    emailDomain: string;
  }[];
  phones: {
    notes: string;
    phoneLabel: string;
    number: string;
  }[];
  contact_type: string[];
  contact_type_ids: string[];
  flattened_hash_tags: string;
  company: string;
  department: string;
  job_title: string;
  picture_url: string;
};

export type ContactType = {
  id: string;
  name: string;
};

export type PhoneType =
  | 'cell'
  | 'fax'
  | 'home'
  | 'main'
  | 'work'
  | 'workMobile'
  | 'other';

export type PhoneEntry = { type: PhoneType; value: string };

export interface AddressEntry {
  street?: string;
  city?: string;
  zip?: string;
  st?: string;
  street2?: string;
}
export interface EmailEntry {
  notes: string;
  emailLabel: string;
  address: string;
  emailDomain: string;
}
