# Case Types Seeder System

This seeder system provides a flexible way to populate your organization with default or custom case types and their associated folder templates.

## Overview

The seeder system separates schema creation from data population, allowing for:
- Customizable default case types
- Organization-specific case type configurations
- Easy modification of folder templates
- Safe re-seeding with conflict detection

## Default Case Types

The system includes 10 pre-configured legal case types:

1. **General Legal** - General legal matters and consultations
2. **Contract Review** - Contract analysis and review cases
3. **Litigation** - Court cases and legal disputes
4. **Corporate Law** - Business formation and corporate matters
5. **Real Estate** - Property transactions and real estate law
6. **Family Law** - Divorce, custody, and family legal matters
7. **Employment Law** - Workplace disputes and employment issues
8. **Intellectual Property** - Patents, trademarks, and IP protection
9. **Criminal Defense** - Criminal law and defense cases
10. **Bankruptcy** - Bankruptcy and debt restructuring cases

Each case type includes appropriate folder templates for that practice area.

## API Endpoints

### Preview Default Configuration
```http
GET /cases/seed/preview
```
Returns a preview of what would be seeded without creating anything.

**Response:**
```json
{
  "message": "Preview of default case types and templates",
  "case_types": [
    {
      "name": "litigation",
      "display_name": "Litigation",
      "description": "Court cases and legal disputes",
      "color": "#EF4444",
      "icon": "court-hammer",
      "template_count": 6
    }
  ],
  "total_case_types": 10,
  "total_templates": 48
}
```

### Run Default Seeder
```http
POST /cases/seed/run
```

**Request Body (optional):**
```json
{
  "force": false  // Set to true to seed even if case types already exist
}
```

**Response:**
```json
{
  "success": true,
  "message": "Default case types and templates seeded successfully",
  "seeded_case_types": 10,
  "case_types": [
    {
      "id": "uuid",
      "name": "litigation",
      "display_name": "Litigation"
    }
  ]
}
```

### Custom Seeder
```http
POST /cases/seed/custom
```

**Request Body:**
```json
{
  "case_types": [
    {
      "name": "tax_law",
      "display_name": "Tax Law",
      "description": "Tax planning and disputes",
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
}
```

## Customization

### Modifying Default Case Types

To customize the default case types, edit the `default-case-types.ts` file:

```typescript
export const DEFAULT_CASE_TYPES: CaseTypeConfig[] = [
  {
    name: 'custom_practice',
    display_name: 'Custom Practice Area',
    description: 'Your custom practice description',
    color: '#6366F1',
    icon: 'custom-icon',
    folder_templates: [
      {
        name: 'Custom Folder',
        path: '/custom-folder',
        sort_order: 1,
        is_required: true
      }
    ]
  }
];
```

### Folder Template Structure

Each folder template has the following properties:

- `name` (string, required): Display name for the folder
- `path` (string, required): Path where the folder will be created (e.g., '/contracts')
- `parent_path` (string, optional): Parent folder path for nested structures
- `sort_order` (number): Order in which folders are displayed/created
- `is_required` (boolean, default: true): Whether this folder is required for the case type

### Colors and Icons

Use standard hex colors for the `color` field and icon names that correspond to your UI icon library for the `icon` field.

Popular legal icons:
- `scale` - General legal
- `document-text` - Contracts
- `court-hammer` - Litigation
- `building-office` - Corporate
- `home` - Real Estate
- `users` - Family law
- `briefcase` - Employment
- `lightbulb` - IP
- `shield-check` - Criminal defense
- `calculator` - Financial/tax

## Safety Features

### Conflict Detection
- The system checks for existing case types before seeding
- Use `force: true` to seed anyway (useful for development)
- Individual templates are checked to prevent duplicates

### Permission Control
- Only organization administrators (admin/owner roles) can run seeders
- All operations respect multi-tenant isolation

### Error Handling
- Detailed error reporting for each case type and template
- Partial success handling - some case types can succeed while others fail
- Comprehensive logging for debugging

## Best Practices

1. **Preview First**: Always use `/seed/preview` to see what will be created
2. **Test in Development**: Test custom configurations in a development environment first
3. **Backup**: Consider backing up your case types configuration before major changes
4. **Incremental Updates**: Use the custom seeder for adding new case types rather than re-seeding everything
5. **Documentation**: Document any custom case types you create for your organization

## Example Workflows

### Initial Setup (New Organization)
1. `GET /cases/seed/preview` - Review what will be created
2. `POST /cases/seed/run` - Create default case types
3. Test case creation with different case types

### Adding Custom Case Type
1. Design your folder structure
2. `POST /cases/seed/custom` - Add your custom case type
3. Test case creation with the new type

### Modifying Defaults
1. Edit `default-case-types.ts`
2. Deploy the updated function
3. Use `POST /cases/seed/run` with `force: true` if needed

## Troubleshooting

### Common Issues

**"Case types already exist"**
- Use `force: true` in the request body to seed anyway
- Or check existing case types and decide if you want to add custom ones instead

**"Only administrators can run seeders"**
- Ensure the user has admin or owner role in the organization
- Check the organization membership in the database

**Template creation failures**
- Check that paths are unique within a case type
- Ensure required fields (name, path) are provided
- Verify parent_path references exist if using nested folders

**Import errors**
- Ensure the seeder files are in the correct location
- Check that TypeScript interfaces match the expected structure