# Doc-Intel Security Implementation Test Plan

## BE-004: Storage paths & signed URL download

### Implementation Summary
1. ✅ Updated doc-intel Edge Function to use secure storage paths: `tenant/<tenant_id>/documents/<doc_id>/*`
2. ✅ Implemented signed URL generation endpoint with 1-hour maximum expiration
3. ✅ Added doc-intel function to Supabase configuration 
4. ✅ Updated Google Cloud Storage service with secure path structure
5. ✅ Disabled direct public access via getBlobUrl method

### Security Features Implemented

#### Secure Storage Paths
- Files are now stored under: `tenant/<tenant_id>/documents/<doc_id>/<timestamp>_<filename>`
- Each document gets its own folder based on document ID
- Tenant isolation prevents cross-tenant access

#### Signed URL Generation
- New endpoint: `GET /documents/:id/download`
- Authorization: User must own the document (verified via user_id)
- Maximum 1-hour expiration enforced
- Returns signed URL with metadata

#### Access Control
- Document ownership verification before URL generation
- No direct public access to files
- Time-limited access through signed URLs only

### Test Cases

#### 1. Upload Security Test
```bash
# Test secure path generation
curl -X POST "http://localhost:54321/functions/v1/doc-intel/upload" \
  -H "Authorization: Bearer <token>" \
  -H "X-Org-Id: <org_id>" \
  -H "X-User-Id: <user_id>" \
  -F "file=@test-document.pdf"

# Expected: File stored at tenant/<tenant_id>/documents/<doc_id>/<timestamp>_test-document.pdf
```

#### 2. Signed URL Generation Test
```bash
# Test authorized access
curl -X GET "http://localhost:54321/functions/v1/doc-intel/documents/<doc_id>/download" \
  -H "Authorization: Bearer <token>" \
  -H "X-Org-Id: <org_id>" \
  -H "X-User-Id: <user_id>"

# Expected: Returns signed URL with 1-hour expiration
```

#### 3. Authorization Test
```bash
# Test unauthorized access (different user)
curl -X GET "http://localhost:54321/functions/v1/doc-intel/documents/<doc_id>/download" \
  -H "Authorization: Bearer <other_user_token>" \
  -H "X-Org-Id: <org_id>" \
  -H "X-User-Id: <other_user_id>"

# Expected: 404 "Document not found or access denied"
```

#### 4. Expiration Test
- Generate signed URL
- Wait 1+ hours
- Attempt to access URL
- Expected: Access denied (expired)

### Compliance with Security Requirements

1. ✅ **Secure Storage Paths**: `tenant/<tenant_id>/documents/<doc_id>/*`
2. ✅ **Server Authorization**: User ownership verified before URL generation  
3. ✅ **Short-lived URLs**: Maximum 1-hour expiration enforced
4. ✅ **No Public Access**: getBlobUrl method disabled, bucket should block public reads
5. ✅ **Tenant Isolation**: Files organized by tenant ID

### Dependencies
This implementation satisfies the dependency requirement for FE-003.

### Production Deployment Checklist
- [ ] Verify Google Cloud Storage bucket has public read access disabled
- [ ] Test with real authentication tokens
- [ ] Validate cross-tenant isolation
- [ ] Performance test with large documents
- [ ] Monitor signed URL generation performance