import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText } from 'lucide-react';

type ExpenseRow = {
	amount: string;
	expenseType: string;
	entity: {
		name: string;
		contact?: string;
		phone?: string;
		email?: string;
	};
	type: string;
	invoiceNumber?: string;
	invoiceAttachment?: string;
	dateOfInvoice?: string;
	dueDate?: string;
	billNo?: string;
	description?: string;
	memo?: string;
	notes?: string;
	notifyAdmin?: string;
	createInQB?: string;
	createBillingItem?: string;
	status?: string;
	dateOfCheck?: string;
	checkNumber?: string;
	lastUpdateFromQB?: string;
	copyOfCheck?: string;
	createdDate?: string;
};

const sampleRows: ExpenseRow[] = [
	{
		amount: '$1,815.00',
		expenseType: 'Bill',
		entity: {
			name: 'White Horse Group LLC',
			contact: 'Steve Herrera',
			phone: '2143940259',
			email: 'white-horse@sbcglobal.net',
		},
		type: 'n/a',
		invoiceNumber: '2501004',
		invoiceAttachment: '2025.03.07- Invoice 2501004- Courtroom Setup D…',
		dateOfInvoice: '3/7/2025',
		dueDate: '4/7/2025',
		billNo: 'n/a',
		description: 'Court Room Set up, Days in Court and Courtroom Tear Down',
		memo: 'n/a',
		notes: undefined,
		notifyAdmin: '',
		createInQB: 'Yes',
		createBillingItem: 'No',
		status: 'Deleted',
		dateOfCheck: '',
		checkNumber: '',
		lastUpdateFromQB: '4/1/2025 at 12:57pm (MDT)',
		copyOfCheck: '',
		createdDate: '3/14/2025 at 9:58 AM',
	},
	{
		amount: '$3,697.50',
		expenseType: 'Bill',
		entity: {
			name: 'White Horse Group LLC',
			contact: 'Steve Herrera',
			phone: '2143940259',
			email: 'white-horse@sbcglobal.net',
		},
		type: 'n/a',
		invoiceNumber: '2401325',
		invoiceAttachment: '2025.03.07- Invoice 2401325- Arbitration Video E…',
		dateOfInvoice: '3/7/2025',
		dueDate: '4/7/2025',
		billNo: 'n/a',
		description: 'Arbitration Video Editing Services',
		memo: 'n/a',
		notes:
			'Video Editing Services for Deposition of: Leigh Levy, Corp. Rep Nick Linville, Marcus Murphy, Ryan Radebach, Neal Christopher Bartlett',
		notifyAdmin: '',
		createInQB: 'Yes',
		createBillingItem: 'No',
		status: 'Deleted',
		dateOfCheck: '',
		checkNumber: '',
		lastUpdateFromQB: '4/1/2025 at 12:54pm (MDT)',
		copyOfCheck: '',
		createdDate: '3/14/2025 at 9:34 AM',
	},
	{
		amount: '$2,664.57',
		expenseType: 'Check',
		entity: {
			name: 'Wexco International',
			contact: 'Wexco - Houston',
			phone: '800-559-3877',
			email: 'accounting@aperture',
		},
		type: 'n/a',
		invoiceNumber: '28509.01.25',
		invoiceAttachment: '2025.01.28- Invoice 28509.01.25…',
		dateOfInvoice: '1/28/2025',
		dueDate: '',
		billNo: 'n/a',
		description: 'Work Session and Expert Testimony',
		memo: 'Invoice 28509.01.25- R. Galiazzi',
		notes: '',
		notifyAdmin: 'Activated by Katonya Maddox on 1/29/2025 at 2:39 PM',
		createInQB: 'Yes',
		createBillingItem: 'No',
		status: 'Printed',
		dateOfCheck: '1/29/2025',
		checkNumber: '11193',
		lastUpdateFromQB: '1/29/2025 at 2:01pm (MST)',
		copyOfCheck: 'n/a',
		createdDate: '1/29/2025 at 2:39 PM',
	},
];

export default function ExpenseTable() {
	const totalAmountDisplay = '$82,022.60';

	return (
		<div className='space-y-2'>
			<div className='text-muted-foreground flex items-center justify-between rounded-md border bg-card px-3 py-2 text-xs'>
				<div>
					<span className='font-medium'>Amount:</span> {totalAmountDisplay}
				</div>
			</div>
			<div className='w-full overflow-x-auto rounded-md border max-w-[82vw]'>
				<Table className='w-full table-auto text-xs'>
					<TableHeader>
						<TableRow className='bg-muted/50'>
							<TableHead>
								<Checkbox aria-label='Select all' />
							</TableHead>
							<TableHead className='w-24'>Amount</TableHead>
							<TableHead className='w-24'>Expense Type</TableHead>
							<TableHead className='w-auto'>Entity Being Paid</TableHead>
							<TableHead className='hidden md:table-cell w-16'>Type</TableHead>
							<TableHead className='hidden lg:table-cell w-28'>Invoice Number</TableHead>
							<TableHead className='hidden lg:table-cell w-[240px]'>Invoice Attachment</TableHead>
							<TableHead className='w-24'>Date of Invoice</TableHead>
							<TableHead className='w-24'>Due Date</TableHead>
							<TableHead className='hidden xl:table-cell w-20'>Bill no.</TableHead>
							<TableHead className='hidden xl:table-cell min-w-[20ch]'>Expense Description</TableHead>
							<TableHead className='hidden 2xl:table-cell min-w-[20ch]'>Memo</TableHead>
							<TableHead className='hidden 2xl:table-cell min-w-[20ch]'>Notes</TableHead>
							<TableHead className='hidden 2xl:table-cell w-[220px]'>Notify Admin of Check Payment</TableHead>
							<TableHead className='hidden xl:table-cell w-28'>Create expense in QuickBooks?</TableHead>
							<TableHead className='hidden xl:table-cell w-28'>Create Billing Item?</TableHead>
							<TableHead className='w-24'>Status</TableHead>
							<TableHead className='hidden 2xl:table-cell w-28'>Date of Check</TableHead>
							<TableHead className='hidden 2xl:table-cell w-28'>Check Number</TableHead>
							<TableHead className='hidden lg:table-cell w-[220px]'>Last update from QuickBooks</TableHead>
							<TableHead className='hidden 2xl:table-cell w-24'>Copy of Check</TableHead>
							<TableHead className='hidden lg:table-cell w-[180px]'>Created Date</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sampleRows.map((r, idx) => (
							<TableRow key={idx} className='odd:bg-card even:bg-muted/20'>
								<TableCell>
									<Checkbox aria-label={`Select row ${idx + 1}`} />
								</TableCell>
								<TableCell className='font-medium'>{r.amount}</TableCell>
								<TableCell className='truncate'>{r.expenseType}</TableCell>
								<TableCell className='w-auto'>
									<div className='flex items-start gap-2'>
										<div className='bg-primary/20 text-primary flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold'>
											{r.entity.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
										</div>
										<div className='leading-5'>
											<div className='font-medium break-words'>{r.entity.name}</div>
											{r.entity.contact && (
												<span className='text-muted-foreground text-xs'>({r.entity.contact})</span>
											)}
											<div className='text-primary text-xs break-words'>{r.entity.phone}</div>
											<div className='text-primary text-xs break-words'>{r.entity.email}</div>
										</div>
									</div>
								</TableCell>
								<TableCell className='hidden md:table-cell'>{r.type}</TableCell>
								<TableCell className='hidden lg:table-cell'>{r.invoiceNumber || '—'}</TableCell>
								<TableCell className='hidden lg:table-cell'>
									{r.invoiceAttachment ? (
										<div className='flex items-center gap-2'>
											<FileText className='text-destructive h-4 w-4' />
											<a className='text-primary max-w-[240px] truncate underline-offset-2 hover:underline' href='#'>
												{r.invoiceAttachment}
											</a>
										</div>
									) : (
										<span className='text-muted-foreground'>—</span>
									)}
								</TableCell>
								<TableCell className='truncate'>{r.dateOfInvoice || '—'}</TableCell>
								<TableCell className='truncate'>{r.dueDate || '—'}</TableCell>
								<TableCell className='hidden xl:table-cell'>{r.billNo || '—'}</TableCell>
								<TableCell className='hidden xl:table-cell min-w-[30ch] whitespace-pre-wrap break-words leading-5'>{r.description || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell min-w-[30ch] whitespace-pre-wrap break-words leading-5'>{r.memo || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell min-w-[30ch] whitespace-pre-wrap break-words leading-5'>{r.notes || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell min-w-[30ch] whitespace-pre-wrap break-words leading-5'>{r.notifyAdmin || '—'}</TableCell>
								<TableCell className='hidden xl:table-cell'>{r.createInQB || '—'}</TableCell>
								<TableCell className='hidden xl:table-cell'>{r.createBillingItem || '—'}</TableCell>
								<TableCell className='truncate'>{r.status || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell'>{r.dateOfCheck || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell'>{r.checkNumber || '—'}</TableCell>
								<TableCell className='hidden lg:table-cell break-words'>{r.lastUpdateFromQB || '—'}</TableCell>
								<TableCell className='hidden 2xl:table-cell'>{r.copyOfCheck || '—'}</TableCell>
								<TableCell className='hidden lg:table-cell break-words'>{r.createdDate || '—'}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
