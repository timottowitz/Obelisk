'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { quickbooksService } from '@/services/quickbooks-service';
import { useOrganization } from '@clerk/nextjs';
import { toast } from 'sonner';

interface AccountMapping {
  cost_type: string;
  qb_account_id?: string;
  qb_account_name?: string;
  qb_class_id?: string;
  qb_class_name?: string;
}

interface QuickBooksAccount {
  id: string;
  name: string;
  account_type: string;
  account_sub_type?: string;
  active: boolean;
}

interface QuickBooksClass {
  id: string;
  name: string;
  active: boolean;
}

const DEFAULT_COST_TYPES = [
  'Legal Fees',
  'Court Fees',
  'Expert Witness',
  'Deposition Costs',
  'Travel Expenses',
  'Document Production',
  'Investigation Costs',
  'Medical Records',
  'Filing Fees',
  'Service of Process',
  'Transcript Costs',
  'Other Expenses'
];

export default function QuickBooksMappingsPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<QuickBooksAccount[]>([]);
  const [classes, setClasses] = useState<QuickBooksClass[]>([]);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [newCostType, setNewCostType] = useState('');

  useEffect(() => {
    if (organization) {
      fetchData();
    }
  }, [organization]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accountsRes, classesRes] = await Promise.all([
        quickbooksService.getAccounts(),
        quickbooksService.getClasses()
      ]);

      setAccounts(accountsRes as QuickBooksAccount[]);
      setClasses(classesRes as QuickBooksClass[]);

      // Initialize mappings with default cost types
      const initialMappings = DEFAULT_COST_TYPES.map((costType) => ({
        cost_type: costType,
        qb_account_id: '',
        qb_account_name: '',
        qb_class_id: '',
        qb_class_name: ''
      }));

      setMappings(initialMappings);
    } catch (error) {
      console.error('Failed to fetch QuickBooks data:', error);
      toast.error('Failed to fetch QuickBooks accounts and classes');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (costType: string, accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    setMappings((prev) =>
      prev.map((m) =>
        m.cost_type === costType
          ? {
              ...m,
              qb_account_id: accountId,
              qb_account_name: account?.name || ''
            }
          : m
      )
    );
  };

  const handleClassChange = (costType: string, classId: string) => {
    const qbClass = classes.find((c) => c.id === classId);
    setMappings((prev) =>
      prev.map((m) =>
        m.cost_type === costType
          ? {
              ...m,
              qb_class_id: classId,
              qb_class_name: qbClass?.name || ''
            }
          : m
      )
    );
  };

  const handleAddCostType = () => {
    if (newCostType && !mappings.some((m) => m.cost_type === newCostType)) {
      setMappings((prev) => [
        ...prev,
        {
          cost_type: newCostType,
          qb_account_id: '',
          qb_account_name: '',
          qb_class_id: '',
          qb_class_name: ''
        }
      ]);
      setNewCostType('');
    }
  };

  const handleRemoveCostType = (costType: string) => {
    if (!DEFAULT_COST_TYPES.includes(costType)) {
      setMappings((prev) => prev.filter((m) => m.cost_type !== costType));
    }
  };

  const handleSaveMappings = async () => {
    setSaving(true);
    try {
      const validMappings = mappings.filter((m) => m.qb_account_id);

      for (const mapping of validMappings) {
        await quickbooksService.saveMapping(mapping);
      }

      toast.success(
        `Successfully saved ${validMappings.length} account mappings`
      );
    } catch (error) {
      console.error('Failed to save mappings:', error);
      toast.error('Failed to save account mappings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-6 p-8'>
      <div className='flex items-center space-x-4'>
        <Button
          onClick={() => window.history.back()}
          className='cursor-pointer'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Integrations
        </Button>
      </div>

      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          QuickBooks Account Mappings
        </h1>
        <p className='text-muted-foreground'>
          Map your expense cost types to QuickBooks accounts and classes for
          automatic categorization.
        </p>
      </div>

      {accounts.length === 0 && (
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            No QuickBooks accounts found. Please ensure you're connected to
            QuickBooks and have accounts set up.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cost Type Mappings</CardTitle>
          <CardDescription>
            Configure how each cost type should be categorized in QuickBooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-end gap-2'>
              <div className='flex-1'>
                <Label htmlFor='new-cost-type'>Add Custom Cost Type</Label>
                <Input
                  id='new-cost-type'
                  placeholder='Enter cost type name'
                  value={newCostType}
                  onChange={(e) => setNewCostType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCostType();
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddCostType} disabled={!newCostType}>
                <Plus className='mr-2 h-4 w-4' />
                Add
              </Button>
            </div>

            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cost Type</TableHead>
                    <TableHead>QuickBooks Account</TableHead>
                    <TableHead>QuickBooks Class</TableHead>
                    <TableHead className='w-[50px]'></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.cost_type}>
                      <TableCell className='font-medium'>
                        {mapping.cost_type}
                        {DEFAULT_COST_TYPES.includes(mapping.cost_type) && (
                          <Badge variant='secondary' className='ml-2'>
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.qb_account_id}
                          onValueChange={(value) =>
                            handleAccountChange(mapping.cost_type, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select account' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=''>None</SelectItem>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.account_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.qb_class_id || ''}
                          onValueChange={(value) =>
                            handleClassChange(mapping.cost_type, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder='Select class (optional)' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=''>None</SelectItem>
                            {classes.map((qbClass) => (
                              <SelectItem key={qbClass.id} value={qbClass.id}>
                                {qbClass.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {!DEFAULT_COST_TYPES.includes(mapping.cost_type) && (
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() =>
                              handleRemoveCostType(mapping.cost_type)
                            }
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className='flex justify-end'>
              <Button onClick={handleSaveMappings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className='mr-2 h-4 w-4' />
                    Save Mappings
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
