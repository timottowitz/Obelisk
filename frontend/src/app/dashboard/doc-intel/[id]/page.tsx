import DocumentReviewClient from './document-review-client';

type PageProps = { params: Promise<{ id: string }> };

export default async function Page(props: PageProps) {
  const { id } = await props.params;
  
  return <DocumentReviewClient id={id} />;
}