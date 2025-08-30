# 📚 Doc Intel + Bennett Legal Taxonomy Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [How Doc Intel Works](#how-doc-intel-works)
3. [DocETL Processing Pipeline](#docetl-processing-pipeline)
4. [Bennett Legal Taxonomy Integration](#bennett-legal-taxonomy-integration)
5. [Complete Workflow Example](#complete-workflow-example)
6. [Setting Up the System](#setting-up-the-system)
7. [Troubleshooting](#troubleshooting)

---

## Overview

**Doc Intel** is an AI-powered document intelligence system that automatically extracts, classifies, and manages information from legal documents. When combined with the **Bennett Legal taxonomy**, it becomes a specialized legal document processing platform that can handle 132+ document types across Personal Injury (PI) and Solar litigation cases.

### 🎯 What It Does
- **Uploads** legal documents (PDFs, Word docs, etc.)
- **Classifies** them into 132+ legal document types
- **Extracts** 15+ types of entities (names, dates, amounts, etc.)
- **Routes** documents to the right legal staff automatically
- **Tracks** everything in a searchable database

---

## How Doc Intel Works

### The Simple Version
Think of Doc Intel as a smart assistant that reads your documents and tells you what's important:

1. **You upload a document** → Like dropping a file into a smart inbox
2. **AI reads it** → Understands what type of document it is
3. **Extracts key information** → Finds names, dates, amounts, etc.
4. **You review & confirm** → Check the AI's work
5. **System learns & improves** → Gets better over time

### The Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Upload   │  │ Document │  │ Entity   │  │ Review   │   │
│  │ Screen   │→ │ List     │→ │ Extract  │→ │ Workbench│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Upload   │  │ Process  │  │ Entity   │  │ Workflow │   │
│  │ Handler  │→ │ Queue    │→ │ Manager  │→ │ Router   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROCESSING ENGINE                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ DocETL   │  │ Taxonomy │  │ Entity   │  │ Quality  │   │
│  │ Pipeline │→ │ Classifier│→ │ Extractor│→ │ Validator│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Documents │  │ Entities │  │ Taxonomy │  │ Workflows│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## DocETL Processing Pipeline

### What is DocETL?
**DocETL** (Document Extract, Transform, Load) is the brain of the system. It's a Python-based tool that:
- **Reads** documents in any format
- **Understands** the content using AI
- **Extracts** structured data
- **Transforms** it into usable information

### How DocETL Works Step-by-Step

#### Step 1: Document Ingestion
```yaml
# The document enters the pipeline
input:
  type: pdf
  source: user_upload
  file: "Settlement_Agreement_2024.pdf"
```

#### Step 2: Text Extraction
```yaml
# DocETL extracts all text from the document
extract:
  method: pdf_parser
  output:
    pages: 12
    text: "SETTLEMENT AGREEMENT between John Doe (Plaintiff)..."
    confidence: 0.98
```

#### Step 3: Document Classification
```yaml
# AI determines what type of document this is
classify:
  model: bennett_legal_classifier
  result:
    type: "Settlement Documents"
    category: "Settlement"
    confidence: 0.95
    subcategory: "Settlement Agreement"
```

#### Step 4: Entity Extraction
```yaml
# AI finds and extracts key information
extract_entities:
  models:
    - plaintiff_extractor:
        found: "John Doe"
        confidence: 0.97
    - defendant_extractor:
        found: "ABC Insurance Company"
        confidence: 0.96
    - settlement_amount:
        found: "$125,000"
        confidence: 0.99
    - document_date:
        found: "2024-01-15"
        confidence: 0.94
```

#### Step 5: Context Enrichment
```yaml
# System adds context around each entity
enrich:
  plaintiff:
    value: "John Doe"
    context: "...Agreement between John Doe (Plaintiff) and ABC..."
    location: 
      page: 1
      line: 3
      char_start: 45
      char_end: 53
```

#### Step 6: Quality Validation
```yaml
# System checks if extraction makes sense
validate:
  checks:
    - dates_are_valid: true
    - amounts_are_numeric: true
    - names_are_complete: true
  quality_score: 0.96
```

---

## Bennett Legal Taxonomy Integration

### What is the Bennett Legal Taxonomy?
It's a specialized classification system that understands legal documents the way lawyers do. Think of it as a filing system that knows exactly where everything belongs.

### The 132+ Document Types
The taxonomy recognizes documents across these major categories:

#### 📋 **Legal Documents**
- **Pleadings**: Complaints, Answers, Motions, Petitions
- **Discovery**: Interrogatories, Depositions, Requests for Production
- **Court Documents**: Orders, Judgments, Notices of Hearing
- **Settlement**: Demand Letters, Settlement Agreements, Releases

#### 🏥 **Medical Records**
- **Diagnostic**: MRI, X-rays, CT Scans, Lab Results
- **Treatment**: Hospital Records, Physical Therapy Notes, Prescriptions
- **Progress**: SOAP Notes, Visit Notes, Discharge Summaries
- **Billing**: Medical Bills, Medicare Summaries, Liens

#### 💼 **Insurance Documents**
- **Policies**: Insurance Policies, Declarations
- **Claims**: Claim Notes, Correspondence, Denials/Acceptances
- **Benefits**: EOBs, PIP Logs, Medicare Info Requests

#### ☀️ **Solar Litigation** (Special Category)
- **Contracts**: Solar Agreements, Financing Documents
- **Evidence**: Photos, Expert Reports, UCC-1 Liens
- **Communications**: Emails, Texts, Call Logs with Solar Companies
- **Financial**: Electricity Bills (Pre/Post), Banking Records

### The 15 Extraction Models

Each model is an AI specialist that looks for specific information:

1. **👨‍⚕️ Doctor** - Finds physician names in medical records
2. **📧 Sender** - Identifies who sent correspondence
3. **📅 Document Date** - When the document was created
4. **⏰ Event Date** - When something happened (appointments, hearings)
5. **🏢 Insurance Company** - Identifies insurers
6. **📄 Policy Number** - Finds policy identifiers
7. **👤 Plaintiff** - Identifies the person suing
8. **👥 Defendant** - Identifies who's being sued
9. **⚖️ Attorney** - Finds lawyer names
10. **🏥 Medical Facility** - Hospital/clinic names
11. **🤕 Injury Type** - What injuries are mentioned
12. **💰 Settlement Amount** - Dollar amounts in settlements
13. **🔢 Case Number** - Legal case identifiers
14. **🏛️ Court** - Which court is handling the case
15. **☀️ Solar Company** - Solar installer/finance companies

### How Taxonomy Drives Processing

```python
# Example: Processing a Medical Bill

1. Document Upload: "St_Mary_Hospital_Bill_2024.pdf"
   ↓
2. Taxonomy Classifier Runs:
   - Identifies: "Medical Bill"
   - Category: "Bills/Liens"
   - Confidence: 0.97
   ↓
3. Specific Models Activated:
   - Medical Facility Model → "St. Mary's Hospital"
   - Document Date Model → "March 15, 2024"
   - Provider Model → "Dr. Sarah Johnson"
   - Amount Model → "$15,432.50"
   ↓
4. Workflow Routing:
   - Assignment: Paralegal (based on document type)
   - Priority: High (amount > $10,000)
   - Task: "Review medical bill for case #12345"
   ↓
5. Automatic Actions:
   - Create lien tracking entry
   - Alert case manager
   - Add to settlement calculation
```

---

## Complete Workflow Example

### Scenario: Processing a Car Accident Case

Let's walk through a real example of processing documents for a personal injury case:

#### 1. **Initial Upload Batch**
Attorney uploads 50 documents from a new client's case:
```
- Police Report
- Medical Records (ER visit, follow-ups)
- Insurance Policy
- Photos of accident scene
- Witness statements
- Medical bills
```

#### 2. **Automatic Classification**
System categorizes each document:
```
Police Report → Investigation/Reports/Evidence → Incident Report
ER Records → Medical Treatment → Hospital ED Note
Insurance Policy → Claims → Insurance Policy
Photos → Investigation/Reports/Evidence → Evidence Photos
Witness Statements → Investigation/Reports/Evidence → Witness Statement
Medical Bills → Bills/Liens → Medical Bill
```

#### 3. **Entity Extraction**
For each document, relevant entities are extracted:

**Police Report:**
- Event Date: "2024-01-10 14:30"
- Location: "Interstate 95, Mile Marker 42"
- Parties: "John Doe" (injured), "Jane Smith" (at fault)
- Officer: "Badge #4521"

**Medical Records:**
- Provider: "Mercy General Hospital"
- Doctor: "Dr. Michael Chen"
- Diagnosis: "Whiplash, Grade 2"
- Treatment: "Physical therapy recommended"

**Insurance Policy:**
- Policy Number: "AUT-2023-789456"
- Coverage Limit: "$100,000/$300,000"
- Insurer: "State Farm Insurance"

#### 4. **Workflow Generation**
Based on the documents, system creates tasks:

```yaml
Tasks Generated:
  - For Paralegal:
    ✓ Review and organize medical records
    ✓ Calculate current medical expenses: $45,230
    ✓ Request missing records from urgent care visit
    
  - For Attorney:
    ✓ Review police report for liability issues
    ✓ High-value case alert (medical bills > $40k)
    
  - Calendar Events:
    ✓ Statute of limitations: 2026-01-10
    ✓ Follow-up with client: 2024-02-15
```

#### 5. **Review Interface**
Paralegal sees organized dashboard:

```
┌─────────────────────────────────────────┐
│ Case: Doe v. Smith (MVA-2024-0110)     │
├─────────────────────────────────────────┤
│ Documents: 50 processed                 │
│ Entities Found: 127                     │
│ Confidence: 94%                         │
│                                         │
│ Key Information:                        │
│ • Plaintiff: John Doe                   │
│ • Defendant: Jane Smith                 │
│ • Insurer: State Farm                   │
│ • Medical Costs: $45,230                │
│ • Lost Wages: Pending                   │
│                                         │
│ [Review Entities] [Export] [Generate Demand]│
└─────────────────────────────────────────┘
```

---

## Setting Up the System

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account
- Python 3.9+ (for DocETL)
- 4GB RAM minimum

### Installation Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/obelisk.git
cd obelisk
```

#### 2. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../supabase/functions
npm install
```

#### 3. Set Up Environment Variables
```bash
# Create .env file
cp .env.example .env

# Add your keys:
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key  # For AI processing
```

#### 4. Deploy Database Migrations
```bash
# Deploy base Doc Intel schema
supabase migration up

# Deploy Bennett Legal taxonomy
npm run deploy:bennett-legal
```

#### 5. Configure DocETL
```bash
# Install DocETL
pip install docetl

# Copy configuration
cp supabase/functions/doc-intel-processor/bennett-legal-docetl-config.yaml ~/.docetl/config.yaml
```

#### 6. Start the Services
```bash
# Start Supabase locally
supabase start

# Start frontend
cd frontend
npm run dev

# Start job processor (in separate terminal)
cd supabase/functions
npm run serve doc-intel-processor
```

### Testing the System

#### Upload Test Document
```bash
# Use the test script
npm run test:upload -- --file="test-docs/settlement.pdf"
```

#### Check Processing Status
```bash
# Monitor job queue
npm run monitor:jobs

# View extracted entities
npm run query:entities -- --doc-id="abc123"
```

---

## Troubleshooting

### Common Issues and Solutions

#### Document Not Processing
**Problem**: Document stuck in "processing" status
**Solution**: 
1. Check job queue: `SELECT * FROM doc_intel_job_queue WHERE status = 'processing'`
2. Restart job processor
3. Check DocETL logs for errors

#### Low Confidence Scores
**Problem**: Entities extracted with <70% confidence
**Solution**:
1. Document quality issue - ensure PDF is text-based, not scanned
2. Run OCR preprocessing for scanned documents
3. Review and confirm entities manually to improve model

#### Wrong Document Classification
**Problem**: Document classified incorrectly
**Solution**:
1. Check if document type exists in taxonomy
2. Manually correct classification
3. System learns from corrections

#### Missing Entities
**Problem**: Important information not extracted
**Solution**:
1. Check if entity type has a specific model
2. Add custom extraction rule for edge cases
3. Use "Objective Truth" marking for training

### Performance Optimization

#### For Large Documents (>100 pages)
```yaml
# Adjust DocETL config
processing:
  chunk_size: 10  # Process 10 pages at a time
  parallel_chunks: 3
  timeout: 300  # 5 minutes
```

#### For High Volume (>1000 docs/day)
```yaml
# Scale job processors
workers:
  count: 5
  memory: 2GB
  concurrent_jobs: 3
```

### Getting Help

#### Log Locations
- Frontend logs: Browser console
- API logs: `supabase/logs/api.log`
- DocETL logs: `~/.docetl/logs/`
- Job processor: `supabase/functions/logs/`

#### Debug Mode
```bash
# Enable verbose logging
export DEBUG=doc-intel:*
npm run dev
```

#### Support Resources
- Documentation: `/docs/doc-intel`
- Issue Tracker: GitHub Issues
- Community: Discord #doc-intel channel

---

## Advanced Features

### Custom Entity Models
You can add your own extraction models:

```yaml
# In docetl-config.yaml
custom_models:
  insurance_adjuster:
    type: name_extractor
    pattern: "Adjuster: ([A-Z][a-z]+ [A-Z][a-z]+)"
    confidence_threshold: 0.80
```

### Workflow Customization
Create custom routing rules:

```sql
-- Add custom workflow rule
INSERT INTO workflow_rules (
  document_type,
  condition,
  action,
  target
) VALUES (
  'Settlement Offer',
  'amount > 100000',
  'notify',
  'senior_attorney@firm.com'
);
```

### API Integration
Send processed data to case management:

```javascript
// After entity confirmation
const caseData = {
  entities: confirmedEntities,
  document: documentMetadata
};

await fetch('https://your-case-system.com/api/import', {
  method: 'POST',
  body: JSON.stringify(caseData)
});
```

---

## Summary

The Doc Intel + Bennett Legal Taxonomy system transforms manual document processing into an automated, intelligent workflow:

1. **Saves Time**: 50 documents processed in minutes, not hours
2. **Improves Accuracy**: 95%+ extraction accuracy for key entities
3. **Ensures Consistency**: Every document processed the same way
4. **Enables Scale**: Handle 10x more cases without 10x more staff
5. **Provides Intelligence**: Surface insights humans might miss

The system learns and improves over time, making your legal practice more efficient and effective with every document processed.

---

*Last Updated: August 2024*
*Version: 1.0.0*
*Bennett Legal Doc Intel Integration*