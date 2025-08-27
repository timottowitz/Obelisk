'use client';

import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ContractAreaChart } from '@/components/charts/contract-area-chart';
import { ContractPieChart } from '@/components/charts/contract-pie-chart';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  IconTrendingUp, 
  IconTrendingDown,
  IconFileText,
  IconCalendar,
  IconGavel,
  IconReport,
  IconDots,
  IconClock,
  IconCheck,
  IconAlertTriangle
} from '@tabler/icons-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Mock data for demonstration
const loanMetrics = {
  totalLoans: {
    value: '$2,450,000',
    count: 45,
    change: 12,
    trend: 'up'
  },
  activeCases: {
    value: 28,
    pending: 8,
    resolved: 20,
    trend: 'up'
  },
  paymentStatus: {
    onTime: 85,
    late: 10,
    defaulted: 5
  }
};

const paymentScheduleData = [
  { month: 'Jan', scheduled: 45000, actual: 42000 },
  { month: 'Feb', scheduled: 48000, actual: 47500 },
  { month: 'Mar', scheduled: 52000, actual: 51000 },
  { month: 'Apr', scheduled: 49000, actual: 48000 },
  { month: 'May', scheduled: 55000, actual: 54500 },
  { month: 'Jun', scheduled: 58000, actual: 56000 },
];

const contractEntitiesData = [
  { name: 'Individual Borrowers', value: 65, color: 'var(--chart-1)' },
  { name: 'Corporate Borrowers', value: 25, color: 'var(--chart-2)' },
  { name: 'With Guarantors', value: 10, color: 'var(--chart-3)' },
];

const stateClausesData = [
  { id: 1, state: 'TX', clauseType: 'Late Payment', contractCount: 12, percentage: 75 },
  { id: 2, state: 'CA', clauseType: 'Solar Rights', contractCount: 8, percentage: 50 },
  { id: 3, state: 'FL', clauseType: 'Hurricane Clause', contractCount: 15, percentage: 90 },
  { id: 4, state: 'NY', clauseType: 'Consumer Protection', contractCount: 6, percentage: 40 },
];

const caseEvents = [
  {
    id: 1,
    type: 'payment',
    icon: <IconCheck className="size-5" />,
    title: 'Payment Received',
    description: 'Monthly payment of $384.26 received from Marina Tellez',
    date: new Date('2024-07-20')
  },
  {
    id: 2,
    type: 'document',
    icon: <IconFileText className="size-5" />,
    title: 'Contract Amendment Filed',
    description: 'ACH payment schedule activated for loan QU-20230505-1527417',
    date: new Date('2024-07-18')
  },
  {
    id: 3,
    type: 'legal',
    icon: <IconGavel className="size-5" />,
    title: 'Legal Notice Sent',
    description: 'Late payment notice sent to 3 borrowers in accordance with state regulations',
    date: new Date('2024-07-15')
  },
];

const columns: ColumnDef<typeof stateClausesData[0]>[] = [
  {
    header: 'State',
    accessorKey: 'state',
    cell: ({ row }) => (
      <Badge variant="outline">{row.getValue('state')}</Badge>
    ),
  },
  {
    header: 'Clause Type',
    accessorKey: 'clauseType',
  },
  {
    header: 'Contracts Affected',
    accessorKey: 'contractCount',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.getValue('contractCount')}</span>
        <Progress value={row.original.percentage} className="w-20 h-2" />
      </div>
    ),
  },
  {
    header: 'Actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <IconDots className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>View Details</DropdownMenuItem>
          <DropdownMenuItem>Edit Clause</DropdownMenuItem>
          <DropdownMenuItem>Generate Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export default function ContractsPage() {
  const { table } = useDataTable({
    data: stateClausesData,
    columns,
    pageCount: 1,
    shallow: false,
    debounceMs: 500
  });

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
            <p className="text-muted-foreground">
              Monitor loans, track payments, and manage legal cases
            </p>
          </div>
          <Button>
            <IconFileText className="mr-2 size-4" />
            New Contract
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Total Active Loans</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {loanMetrics.totalLoans.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600">
                  <IconTrendingUp className="mr-1 size-3" />
                  {loanMetrics.totalLoans.change} new this month
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="text-muted-foreground">
                Across {loanMetrics.totalLoans.count} active contracts
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Active Cases</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {loanMetrics.activeCases.value}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-yellow-600">
                  <IconClock className="mr-1 size-3" />
                  {loanMetrics.activeCases.pending} pending
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="text-muted-foreground">
                {loanMetrics.activeCases.resolved} resolved this month
              </div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>Payment Performance</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {loanMetrics.paymentStatus.onTime}%
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600">
                  <IconCheck className="mr-1 size-3" />
                  On Time
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="flex gap-4 text-xs">
                <span className="text-yellow-600">{loanMetrics.paymentStatus.late}% Late</span>
                <span className="text-red-600">{loanMetrics.paymentStatus.defaulted}% Default</span>
              </div>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button className="justify-start h-8" variant="outline" size="sm">
                <IconFileText className="mr-2 size-3" />
                Generate Contract
              </Button>
              <Button className="justify-start h-8" variant="outline" size="sm">
                <IconCalendar className="mr-2 size-3" />
                Schedule Payment
              </Button>
              <Button className="justify-start h-8" variant="outline" size="sm">
                <IconGavel className="mr-2 size-3" />
                File Legal Notice
              </Button>
              <Button className="justify-start h-8" variant="outline" size="sm">
                <IconReport className="mr-2 size-3" />
                Export Reports
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contract Entities Distribution</CardTitle>
              <CardDescription>Breakdown by borrower type</CardDescription>
            </CardHeader>
            <CardContent>
              <ContractPieChart data={contractEntitiesData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Schedule Performance</CardTitle>
              <CardDescription>Scheduled vs Actual Payments (Last 6 Months)</CardDescription>
            </CardHeader>
            <CardContent>
              <ContractAreaChart
                data={paymentScheduleData}
                categories={['scheduled', 'actual']}
                colors={['var(--chart-1)', 'var(--chart-2)']}
                showLegend
              />
            </CardContent>
          </Card>
        </div>

        {/* State Clauses Table */}
        <Card>
          <CardHeader>
            <CardTitle>State-Specific Clauses</CardTitle>
            <CardDescription>Active clauses by state jurisdiction</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable table={table} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Case Activity</CardTitle>
            <CardDescription>Latest updates across all contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {caseEvents.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      "size-10 rounded-full flex items-center justify-center",
                      event.type === "payment" && "bg-green-100 text-green-600 dark:bg-green-900/20",
                      event.type === "document" && "bg-blue-100 text-blue-600 dark:bg-blue-900/20",
                      event.type === "legal" && "bg-purple-100 text-purple-600 dark:bg-purple-900/20"
                    )}>
                      {event.icon}
                    </div>
                    {index < caseEvents.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1 pb-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{event.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {event.date.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}