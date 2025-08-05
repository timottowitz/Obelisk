import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface TableColumn {
  key: string;
  label: string;
  render?: (
    row: any,
    onEdit?: (row: any) => void,
    onDelete?: (row: any) => void
  ) => React.ReactNode;
  className?: string;
}

interface CaseDetailsTableProps {
  title?: string;
  columns: TableColumn[];
  data: any[];
  className?: string;
  isLoading?: boolean;
  error?: any;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
}

export default function CaseDetailsTable({
  columns,
  data,
  isLoading,
  error,
  onEdit,
  onDelete
}: CaseDetailsTableProps) {
  return (
    <Table className='w-full rounded-md border border-gray-200 text-xs'>
      <TableHeader className='bg-gray-100'>
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={`${column.className} px-3 py-2 text-left text-xs`}
            >
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className='py-4 text-center text-xs text-gray-500'
            >
              Loading...
            </TableCell>
          </TableRow>
        ) : data && data.length > 0 ? (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={`${column.className} px-3 py-2 text-left text-xs`}
                >
                  {column.render
                    ? column.key === 'actions'
                      ? column.render(row, onEdit, onDelete)
                      : column.render(row[column.key])
                    : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className='py-4 text-center text-xs text-gray-500'
            >
              No data available
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
