export type Contact = {
    id: string;
    name: string;
    type: string;
    address: string;
    email?: string;
    phoneNumbers?: (string | { type: any; value: string })[];
    tags?: string[];
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