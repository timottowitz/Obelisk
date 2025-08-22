'use client';

import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useQuickbooksClasses,
  useQuickbooksAccounts,
  useQuickbooksSaveMapping,
  useQuickbooksMappings
} from '@/hooks/useQuickbooks';
import { AccountMapping } from '@/types/quickbooks';
import { useCostTypes } from '@/hooks/useExpenses';
import { CostType } from '@/types/expenses';

export default function QuickBooksMappingsPage() {
  const { data: classes, isLoading: isLoadingClasses } = useQuickbooksClasses();
  const { data: accounts, isLoading: isLoadingAccounts } =
    useQuickbooksAccounts();
  const { data: savedMappings, isLoading: isLoadingMappings } =
    useQuickbooksMappings();
  const [saving, setSaving] = useState(false);
  const [mappings, setMappings] = useState<AccountMapping[]>([]);
  const saveMapping = useQuickbooksSaveMapping();
  const { data: costTypes } = useCostTypes();

  useEffect(() => {
    if (accounts && classes && savedMappings && costTypes) {
      // Create a map of saved mappings for quick lookup
      const savedMappingsMap = new Map(
        savedMappings.mappings.map((m: AccountMapping) => [m.cost_type_id, m])
      );

      // Combine DEFAULT_COST_TYPES with any additional saved cost types
      const allCostTypes = new Set([
        ...costTypes.map((type: CostType) => type.id),
        ...savedMappings.mappings.map((m: AccountMapping) => m.cost_type_id)
      ]);

      // Create mappings with saved data where available
      const initialMappings = Array.from(allCostTypes).map((costType) => {
        const saved = savedMappingsMap.get(costType);
        return {
          cost_type_id: costType,
          cost_type_name: costTypes.find((type: CostType) => type.id === costType)?.name || '',
          qb_account_id: saved?.qb_account_id || '',
          qb_account_name: saved?.qb_account_name || '',
          qb_class_id: saved?.qb_class_id || '',
          qb_class_name: saved?.qb_class_name || ''
        };
      });

      setMappings(initialMappings);
    }
  }, [accounts, classes, savedMappings, costTypes]);

  const handleAccountChange = useCallback(
    (costTypeId: string, accountId: string) => {
      const account = accounts?.accounts.find((a: any) => a.Id === accountId);
      setMappings((prev) =>
        prev.map((m) =>
          m.cost_type_id === costTypeId
            ? {
                ...m,
                qb_account_id: accountId,
                qb_account_name: account?.Name || ''
              }
            : m
        )
      );
    },
    [accounts]
  );

  const handleClassChange = useCallback(
    (costTypeId: string, classId: string) => {
      const qbClass = classes?.classes.find((c: any) => c.Id === classId);
      setMappings((prev) =>
        prev.map((m) =>
          m.cost_type_id === costTypeId
            ? {
                ...m,
                qb_class_id: classId,
                qb_class_name: qbClass?.Name || ''
              }
            : m
        )
      );
    },
    [classes]
  );

  const handleSaveMappings = useCallback(async () => {
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
  }, [mappings, saveMapping]);

  if (isLoadingClasses || isLoadingAccounts || isLoadingMappings) {
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
            No QuickBooks accounts found. Please ensure you&apos;re connected to
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
          <div className='rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>QuickBooks Account</TableHead>
                  <TableHead>QuickBooks Class</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.cost_type_id}>
                    <TableCell className='font-medium'>
                      {mapping.cost_type_name}
                      {costTypes?.some(
                        (type: CostType) => type.id === mapping.cost_type_id
                      ) && (
                        <Badge
                          variant='secondary'
                          className='bg-primary ml-2 text-white'
                        >
                          Default
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.qb_account_id}
                        onValueChange={(value) =>
                          handleAccountChange(mapping.cost_type_id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select account' />
                        </SelectTrigger>
                        <SelectContent>
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
                          handleClassChange(mapping.cost_type_id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select class (optional)' />
                        </SelectTrigger>
                        <SelectContent>
                          {classes &&
                            classes.classes.map((qbClass: any) => (
                              <SelectItem key={qbClass.Id} value={qbClass.Id}>
                                {qbClass.Name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className='flex justify-end'>
            <Button
              onClick={handleSaveMappings}
              disabled={saving}
              className='cursor-pointer'
            >
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
        </CardContent>
      </Card>
    </div>
  );
}
