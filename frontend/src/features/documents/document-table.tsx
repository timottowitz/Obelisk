import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

export default function DocumentTable({
  filteredDocs
}: {
  filteredDocs: {
    name: string;
    privilege: string;
    discovery: string;
    deadline: string;
    review: string;
    phase: string;
    size: string;
    modified: string;
  }[];
}) {
  return (
    <div className='rounded bg-white shadow'>
      <Table className='min-w-full divide-y divide-gray-200'>
        <TableHeader className='bg-gray-100'>
          <TableRow>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Document
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Privilege
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Discovery
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Deadline
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Review
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Phase
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Size
            </TableHead>
            <TableHead className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase'>
              Modified
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredDocs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className='py-6 text-center text-gray-400'>
                No documents found.
              </TableCell>
            </TableRow>
          ) : (
            filteredDocs.map((doc, idx) => (
              <TableRow
                key={doc.name}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                <TableCell className='px-4 py-2 font-medium text-blue-700'>
                  {doc.name}
                </TableCell>
                <TableCell className='px-4 py-2'>
                  <span
                    className={`rounded-2xl px-2 py-1 text-xs ${doc.privilege === 'Work Prod.' ? 'bg-orange-100 text-orange-800' : doc.privilege === 'confidential' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}
                  >
                    {doc.privilege}
                  </span>
                </TableCell>
                <TableCell className='px-4 py-2 text-xs text-gray-700'>
                  <span className="border border-gray-200 rounded-xl px-2 py-1">{doc.discovery}</span>
                </TableCell>
                <TableCell className='px-4 py-2 text-xs text-gray-700'>
                  {doc.deadline}
                </TableCell>
                <TableCell className='px-4 py-2 text-xs'>
                  <span
                    className={`rounded px-2 py-1 ${doc.review === 'approved' ? 'bg-green-600 text-white' : doc.review === 'reviewed' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {doc.review}
                  </span>
                </TableCell>
                <TableCell className='px-4 py-2 text-xs text-gray-700'>
                  {doc.phase}
                </TableCell>
                <TableCell className='px-4 py-2 text-xs text-gray-700'>
                  {doc.size}
                </TableCell>
                <TableCell className='px-4 py-2 text-xs text-gray-700'>
                  {doc.modified}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
