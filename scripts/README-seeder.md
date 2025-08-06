# Case Types Seeder Script

A comprehensive command-line tool for site administrators to seed case types and folder templates across organizations.

## Overview

This seeder script provides a flexible, robust way to:
- Initialize default case types for new organizations
- Batch seed multiple organizations at once
- Use custom case type configurations
- Preview changes before applying them
- Handle errors gracefully with detailed reporting

## Prerequisites

### Environment Variables
```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Dependencies
```bash
npm install @supabase/supabase-js
```

## Usage

### Basic Commands

```bash
# Seed all organizations with default case types
npm run seed:case-types

# Seed specific organization
npm run seed:case-types -- --org=org_2ycgcrzpztj

# Preview what would be seeded (no changes made)
npm run seed:case-types -- --preview

# Force seed even if case types already exist
npm run seed:case-types -- --force

# Use custom configuration file
npm run seed:case-types -- --config=./scripts/examples/custom-case-types.json

# Show help
npm run seed:case-types -- --help
```

### Advanced Examples

```bash
# Preview seeding for specific organization
npm run seed:case-types -- --org=org_2ycgcrzpztj --preview

# Force seed all organizations with custom config
npm run seed:case-types -- --force --config=./my-custom-types.json

# Seed specific org with custom config and force mode
npm run seed:case-types -- --org=org_abc123 --config=./legal-firm-types.json --force
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--org=<schema>` | Seed specific organization by schema name | `--org=org_2ycgcrzpztj` |
| `--force` | Force seed even if case types exist | `--force` |
| `--preview` | Preview changes without applying them | `--preview` |
| `--config=<file>` | Use custom case types configuration | `--config=./custom.json` |
| `--help` | Show help message | `--help` |

## Default Case Types

The script includes 10 pre-configured legal case types:

| Case Type | Templates | Description |
|-----------|-----------|-------------|
| **General Legal** | 4 | Client docs, correspondence, research, billing |
| **Contract Review** | 4 | Original, redlined, final versions, supporting docs |
| **Litigation** | 6 | Pleadings, discovery, evidence, court filings, witnesses, expert reports |
| **Corporate Law** | 5 | Formation, resolutions, agreements, compliance, financials |
| **Real Estate** | 5 | Purchase agreements, title, inspections, financing, closing |
| **Family Law** | 5 | Divorce, custody, financial disclosure, support, mediation |
| **Employment Law** | 5 | Contracts, HR policies, complaints, investigations, settlements |
| **Intellectual Property** | 5 | Patents, trademarks, copyrights, licensing, research |
| **Criminal Defense** | 5 | Case files, evidence, witnesses, court docs, investigation |
| **Bankruptcy** | 5 | Petitions, financials, assets, creditors, court orders |

**Total: 48 folder templates across 10 case types**

## Custom Configuration

### Configuration File Format

Create a JSON file with an array of case type objects:

```json
[
  {
    "name": "tax_law",
    "display_name": "Tax Law", 
    "description": "Tax planning and compliance",
    "color": "#059669",
    "icon": "calculator",
    "folder_templates": [
      {
        "name": "Tax Returns",
        "path": "/tax-returns",
        "sort_order": 1,
        "is_required": true
      },
      {
        "name": "IRS Correspondence", 
        "path": "/irs-correspondence",
        "sort_order": 2,
        "is_required": true
      }
    ]
  }
]
```

### Template Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Display name for the folder |
| `path` | string | ✅ | Folder path (e.g., '/tax-returns') |
| `sort_order` | number | ✅ | Display order (1, 2, 3...) |
| `is_required` | boolean | ❌ | Whether folder is required (default: true) |
| `parent_path` | string | ❌ | Parent folder for nesting |

### Example Custom Configurations

See `scripts/examples/custom-case-types.json` for:
- Tax Law
- Immigration Law  
- Personal Injury

## Output and Logging

### Success Output
```
🚀 Case Types Seeder initialized
🎯 Starting seeder for 3 organization(s)
📦 Seeding 10 case types
🔄 Force mode: DISABLED

📁 Processing organization: Acme Legal (org_2ycgcrzpztj)
  ✅ Created case type: General Legal
    📂 Created/updated 4 templates
  ✅ Created case type: Litigation
    📂 Created/updated 6 templates
  📊 Org Summary: 10 case types, 48 templates, 0 errors

🎉 SEEDING COMPLETE!
📊 Final Summary:
  Organizations: 3
  Case Types Created: 30
  Templates Created: 144
  Errors: 0
  Duration: 2.45s
```

### Preview Output
```
📋 PREVIEW MODE - No changes will be made

🏢 Organizations to process:
  • Acme Legal (org_2ycgcrzpztj)
  • Smith & Associates (org_xyz789)

📦 Case types to seed:
  • General Legal (4 templates)
  • Contract Review (4 templates)
  • Litigation (6 templates)

📊 Summary:
  Organizations: 2
  Case Types: 10
  Total Templates: 48
  Force Mode: NO
```

## Error Handling

### Common Scenarios

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables:
      SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY
   ```

2. **Organization Not Found**
   ```
   ❌ Organization not found: org_invalid123
   ```

3. **Database Connection Issues**
   ```
   ❌ Database connection error: Connection timeout
   ```

4. **Partial Failures**
   ```
   📊 Final Summary:
     Organizations: 2
     Case Types Created: 18
     Templates Created: 89
     Errors: 2  ← Some failures occurred
   ```

### Error Recovery

- Script continues processing other organizations if one fails
- Individual case type failures don't stop processing others
- Detailed error messages help identify specific issues
- Exit code 1 if any errors occurred (useful for CI/CD)

## Safety Features

### Conflict Detection
- Checks for existing case types before creating
- Skips existing items unless `--force` is used
- Prevents accidental data duplication

### Preview Mode
- `--preview` flag shows what would be done
- No database changes made in preview mode
- Perfect for testing configurations

### Validation
- Validates environment variables before starting
- Checks organization existence
- Validates JSON configuration files

## Best Practices

### 1. Always Preview First
```bash
# Preview before running
npm run seed:case-types -- --preview
npm run seed:case-types
```

### 2. Test Custom Configurations
```bash
# Test with single organization first
npm run seed:case-types -- --org=test_org --config=./custom.json --preview
npm run seed:case-types -- --org=test_org --config=./custom.json
```

### 3. Backup Important Data
Before running with `--force`, ensure you have backups of case type configurations.

### 4. Use Version Control
Store custom configuration files in version control for tracking changes.

### 5. Gradual Rollout
For large numbers of organizations, consider seeding in batches:
```bash
# Seed specific organizations one by one
npm run seed:case-types -- --org=org_batch1
npm run seed:case-types -- --org=org_batch2
```

## Integration with CI/CD

### Environment Setup
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Automated Seeding
```yaml
- name: Seed new organizations
  run: |
    npm install
    npm run seed:case-types -- --preview
    npm run seed:case-types
```

## Troubleshooting

### Performance Issues
- Large numbers of organizations: Consider batching
- Network timeouts: Check Supabase connection
- Memory usage: Monitor for large configuration files

### Data Consistency
- Use `--force` carefully in production
- Verify schema names are correct
- Check that templates reference valid paths

### Configuration Issues
- Validate JSON syntax in custom files
- Ensure required fields are present
- Check path formats (should start with '/')

## File Structure

```
scripts/
├── seed-case-types.js          # Main seeder script
├── examples/
│   └── custom-case-types.json  # Example custom configuration
└── README-seeder.md           # This documentation
```

## Support

For issues or questions:
1. Check this documentation first
2. Verify environment variables are set correctly
3. Use `--preview` to debug configuration issues
4. Check console output for specific error messages