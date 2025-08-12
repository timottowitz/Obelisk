export type Contact = {
  id: string;
  name: string;
  avatar_storage_url: string;
  contact_type_id: string;
  contact_type: string;
  prefix?: string;
  suffix?: string;
  nickname?: string;
  company?: string;
  department?: string;
  job_title?: string;
  address: {
    street: string;
    street2: string;
    city: string;
    st: string;
    zip: string;
  }[];
  email: {
    type: string;
    email: string;
  }[];
  phone: {
    type: string;
    number: string;
  }[];
  tags: string[];
  archived: boolean;
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
  type: string;
  email: string;
}
