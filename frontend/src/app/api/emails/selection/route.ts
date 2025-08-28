/**
 * Email Selection API
 * Manages persistent email selection state for multi-select operations
 */

import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { emailSelectionService, SelectionOperation } from '@/lib/services/email-selection';

// Request validation schemas
const getSelectionSchema = z.object({
  folderId: z.string().optional(),
  includeExpired: z.boolean().optional().default(false),
});

const updateSelectionSchema = z.object({
  operation: z.enum(['add', 'remove', 'toggle', 'replace', 'clear'] as const),
  emailIds: z.array(z.string()).max(1000), // Limit to prevent abuse
  folderId: z.string().optional(),
  context: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});

const batchUpdateSchema = z.object({
  operations: z.array(updateSelectionSchema).max(10), // Limit batch operations
});

/**
 * GET /api/emails/selection
 * Get current email selection for user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      folderId: searchParams.get('folderId') || undefined,
      includeExpired: searchParams.get('includeExpired') === 'true',
    };

    const validatedQuery = getSelectionSchema.parse(queryData);

    // Get selection
    const selection = await emailSelectionService.getSelection(
      userId,
      orgId,
      validatedQuery
    );

    if (!selection) {
      return NextResponse.json({
        success: true,
        selection: null,
        selectedEmails: [],
        stats: {
          count: 0,
          hasExpired: false,
        }
      });
    }

    // Get selection stats
    const stats = await emailSelectionService.getSelectionStats(
      userId,
      orgId,
      validatedQuery.folderId
    );

    return NextResponse.json({
      success: true,
      selection: {
        id: selection.id,
        folderId: selection.folder_id,
        selectedEmails: selection.selected_email_ids || [],
        context: selection.selection_context,
        expiresAt: selection.expires_at,
        createdAt: selection.created_at,
        updatedAt: selection.updated_at,
      },
      stats: {
        count: selection.selected_email_ids?.length || 0,
        hasExpired: selection.expires_at ? new Date(selection.expires_at) < new Date() : false,
        totalSelections: stats.totalSelections,
        activeSelections: stats.activeSelections,
        totalSelectedEmails: stats.totalSelectedEmails,
      }
    });

  } catch (error) {
    console.error('Get selection endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/emails/selection
 * Update email selection
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateSelectionSchema.parse(body);

    // Validate email IDs if provided (security check)
    let validatedEmailIds = validatedData.emailIds;
    if (validatedEmailIds.length > 0) {
      validatedEmailIds = await emailSelectionService.validateEmailIds(
        validatedEmailIds,
        userId,
        orgId
      );

      // Check if any emails were filtered out
      if (validatedEmailIds.length !== validatedData.emailIds.length) {
        console.warn(`Filtered out ${validatedData.emailIds.length - validatedEmailIds.length} invalid email IDs`);
      }
    }

    // Update selection
    const updatedSelection = await emailSelectionService.updateSelection(
      userId,
      orgId,
      {
        ...validatedData,
        emailIds: validatedEmailIds,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      selection: {
        id: updatedSelection.id,
        folderId: updatedSelection.folder_id,
        selectedEmails: updatedSelection.selected_email_ids || [],
        context: updatedSelection.selection_context,
        expiresAt: updatedSelection.expires_at,
        createdAt: updatedSelection.created_at,
        updatedAt: updatedSelection.updated_at,
      },
      stats: {
        count: updatedSelection.selected_email_ids?.length || 0,
        operation: validatedData.operation,
        emailsProcessed: validatedEmailIds.length,
      }
    });

  } catch (error) {
    console.error('Update selection endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/emails/selection
 * Batch update selections
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = batchUpdateSchema.parse(body);

    // Process batch operations
    const results = [];
    let totalEmailsProcessed = 0;

    for (const operation of validatedData.operations) {
      // Validate email IDs for each operation
      let validatedEmailIds = operation.emailIds;
      if (validatedEmailIds.length > 0) {
        validatedEmailIds = await emailSelectionService.validateEmailIds(
          validatedEmailIds,
          userId,
          orgId
        );
      }

      const updatedSelection = await emailSelectionService.updateSelection(
        userId,
        orgId,
        {
          ...operation,
          emailIds: validatedEmailIds,
          expiresAt: operation.expiresAt ? new Date(operation.expiresAt) : undefined,
        }
      );

      results.push({
        operation: operation.operation,
        emailIds: validatedEmailIds,
        selectionId: updatedSelection.id,
        count: updatedSelection.selected_email_ids?.length || 0,
      });

      totalEmailsProcessed += validatedEmailIds.length;
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        operationsProcessed: validatedData.operations.length,
        totalEmailsProcessed,
        finalSelectionCount: results[results.length - 1]?.count || 0,
      }
    });

  } catch (error) {
    console.error('Batch update selection endpoint error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/emails/selection
 * Clear email selection
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get organization from headers
    const orgId = request.headers.get('X-Org-Id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || undefined;

    // Clear selections
    await emailSelectionService.clearAllSelections(userId, orgId, folderId);

    return NextResponse.json({
      success: true,
      message: folderId 
        ? `Cleared selections for folder ${folderId}` 
        : 'Cleared all selections'
    });

  } catch (error) {
    console.error('Clear selection endpoint error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}