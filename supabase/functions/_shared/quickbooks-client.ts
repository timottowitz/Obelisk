  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const QUICKBOOKS_CLIENT_ID = Deno.env.get('QUICKBOOKS_CLIENT_ID')!;
const QUICKBOOKS_CLIENT_SECRET = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')!;
const QUICKBOOKS_ENVIRONMENT = Deno.env.get('QUICKBOOKS_ENVIRONMENT') || 'sandbox';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const QUICKBOOKS_API_URL = QUICKBOOKS_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

const QUICKBOOKS_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const API_MINOR_VERSION = '65';

export interface QuickBooksConnection {
  org_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
}

export interface QuickBooksCustomer {
  GivenName?: string;
  FamilyName?: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  ParentRef?: { value: string };
  Job?: boolean;
}

export interface QuickBooksPurchase {
  PaymentType: 'Cash' | 'Check' | 'CreditCard';
  AccountRef: { value: string; name?: string };
  TxnDate: string;
  EntityRef?: { value: string; type: string };
  Line: Array<{
    DetailType: 'AccountBasedExpenseLineDetail';
    Amount: number;
    Description?: string;
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: string; name?: string };
      CustomerRef?: { value: string; name?: string };
      ClassRef?: { value: string; name?: string };
    };
  }>;
}

export interface QuickBooksBill {
  VendorRef: { value: string; name?: string };
  TxnDate: string;
  DueDate?: string;
  Line: Array<{
    DetailType: 'AccountBasedExpenseLineDetail';
    Amount: number;
    Description?: string;
    AccountBasedExpenseLineDetail: {
      AccountRef: { value: string; name?: string };
      CustomerRef?: { value: string; name?: string };
      ClassRef?: { value: string; name?: string };
    };
  }>;
}

export class QuickBooksClient {
  private supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  private connection: QuickBooksConnection
   | null = null;
  private orgId: string;
  private schema: string;

  constructor(orgId: string, schema: string) {
    this.orgId = orgId;
    this.schema = schema;
  }

  async initialize(): Promise<void> {
    // Get connection
    const { data, error } = await this.supabase
      .schema("private")
      .from('quickbooks_connections')
      .select('*')
      .eq('org_id', this.orgId)
      .single();

    if (error || !data) {
      throw new Error('No QuickBooks connection found');
    }

    this.connection = data;

    // Check if token needs refresh
    const tokenExpiry = new Date(this.connection!.token_expiry || '');
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiry < fiveMinutesFromNow) {
      await this.refreshToken();
    }
  }

  private async refreshToken(): Promise<void> {
    if (!this.connection) {
      throw new Error('No connection available');
    }

    const tokenBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.connection.refresh_token
    });

    const authHeader = btoa(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`);

    const response = await fetch(QUICKBOOKS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenBody.toString()
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokenData = await response.json();
    const tokenExpiry = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Update connection in database
    const { error } = await this.supabase
      .from('quickbooks_connections')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expiry: tokenExpiry.toISOString()
      })
      .eq('org_id', this.orgId);

    if (error) {
      throw new Error('Failed to update tokens');
    }

    // Update local connection
    this.connection.access_token = tokenData.access_token;
    this.connection.refresh_token = tokenData.refresh_token;
    this.connection.token_expiry = tokenExpiry.toISOString();
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    if (!this.connection) {
      throw new Error('QuickBooks client not initialized');
    }

    const url = `${QUICKBOOKS_API_URL}/v3/company/${this.connection.realm_id}${endpoint}?minorversion=${API_MINOR_VERSION}`;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.connection.access_token}`,
      'Accept': 'application/json'
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('QuickBooks API error:', responseData);
      throw new Error(responseData.Fault?.Error?.[0]?.Message || 'QuickBooks API request failed');
    }

    return responseData;
  }

  // Customer methods
  async createCustomer(customer: QuickBooksCustomer): Promise<any> {
    return this.makeRequest('POST', '/customer', customer);
  }

  async getCustomer(customerId: string): Promise<any> {
    return this.makeRequest('GET', `/customer/${customerId}`);
  }

  async queryCustomers(query: string): Promise<any> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest('GET', `/query?query=${encodedQuery}`);
  }

  // Purchase methods
  async createPurchase(purchase: QuickBooksPurchase): Promise<any> {
    return this.makeRequest('POST', '/purchase', purchase);
  }

  async getPurchase(purchaseId: string): Promise<any> {
    return this.makeRequest('GET', `/purchase/${purchaseId}`);
  }

  // Bill methods
  async createBill(bill: QuickBooksBill): Promise<any> {
    return this.makeRequest('POST', '/bill', bill);
  }

  async getBill(billId: string): Promise<any> {
    return this.makeRequest('GET', `/bill/${billId}`);
  }

  // Vendor methods
  async createVendor(vendor: any): Promise<any> {
    return this.makeRequest('POST', '/vendor', vendor);
  }

  async queryVendors(query: string): Promise<any> {
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest('GET', `/query?query=${encodedQuery}`);
  }

  // Account methods
  async getAccounts(): Promise<any> {
    const query = "SELECT * FROM Account WHERE Active = true";
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest('GET', `/query?query=${encodedQuery}`);
  }

  // Class methods
  async getClasses(): Promise<any> {
    const query = "SELECT * FROM Class WHERE Active = true";
    const encodedQuery = encodeURIComponent(query);
    return this.makeRequest('GET', `/query?query=${encodedQuery}`);
  }

  // Company info
  async getCompanyInfo(): Promise<any> {
    return this.makeRequest('GET', '/companyinfo/1');
  }
}