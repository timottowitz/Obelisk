'use client';

import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import {
  useQuickbooksClasses,
  useQuickbooksAccounts,
  useQuickbooksSaveMapping
} from '@/hooks/useQuickbooks';
import { AccountMapping } from '@/types/quickbooks';

const DEFAULT_COST_TYPES = [
  "Arbitrator's Fees",
  "Attorney's Fees",
  'Certified Crash Report',
  'Court Filing Fee',
  'Demand Letter Drafting',
  'Deposition Transcript',
  'Expert Fee',
  'Flight',
  'Focus Group/Mock Trial',
  'Gas',
  'Hotel',
  'Investigation',
  'Mailing Service',
  'Meal',
  'Mediator Fees',
  'Mefical Record',
  'Medical Report',
  'Notary',
  'Open Records',
  'Phone Conferencing',
  'Postage',
  'Service of Process',
  'Taxi/Uber'
];

export default function QuickBooksMappingsPage() {
  const { data: classes, isLoading: isLoadingClasses } = useQuickbooksClasses();
  const { data: accounts, isLoading: isLoadingAccounts } =
    useQuickbooksAccounts();
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const [newCostType, setNewCostType] = useState('');
  const saveMapping = useQuickbooksSaveMapping();

  useEffect(() => {
    if (accounts && classes) {
      setMappings(
        DEFAULT_COST_TYPES.map((costType) => ({
          cost_type: costType,
          qb_account_id: '',
          qb_account_name: '',
          qb_class_id: '',
          qb_class_name: ''
        }))
      );
    }
  }, [accounts, classes]);

  const handleAccountChange = (costType: string, accountId: string) => {
    const account = accounts?.accounts.find((a: any) => a.Id === accountId);
    setMappings((prev) =>
      prev.map((m) =>
        m.cost_type === costType
          ? {
              ...m,
              qb_account_id: accountId,
              qb_account_name: account?.Name || ''
            }
          : m
      )
    );
  };

  const handleClassChange = (costType: string, classId: string) => {
    const qbClass = classes?.classes.find((c: any) => c.Id === classId);
    setMappings((prev) =>
      prev.map((m) =>
        m.cost_type === costType
          ? {
              ...m,
              qb_class_id: classId,
              qb_class_name: qbClass?.Name || ''
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
        await saveMapping.mutateAsync(mapping);
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

  if (isLoadingClasses || isLoadingAccounts) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='max-h-[calc(100vh-100px)] space-y-6 overflow-y-auto p-8'>
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

      {accounts && accounts.accounts.length === 0 && (
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
                            <SelectItem value='None'>None</SelectItem>
                            {accounts &&
                              accounts.accounts.map((account: any) => (
                                <SelectItem key={account.Id} value={account.Id}>
                                  {account.Name} ({account.AccountType})
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
                            <SelectItem value='None'>None</SelectItem>
                            {classes &&
                              classes.classes.map((qbClass: any) => (
                                <SelectItem key={qbClass.Id} value={qbClass.Id}>
                                  {qbClass.Name}
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
