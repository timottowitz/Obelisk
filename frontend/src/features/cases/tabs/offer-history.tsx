import { offerHistoryColumns } from './columns';
import CaseDetailsTable from './table';

export default function OfferHistory() {
  return (
    <div>
      <h3 className='mb-4 text-lg font-semibold'>Offer History</h3>
      <CaseDetailsTable columns={offerHistoryColumns} data={[]} />
    </div>
  );
}
