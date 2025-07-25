/**
 * Meeting Types Management Modal
 * Allows users to create, edit, and manage custom meeting types
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { 
  MeetingType, 
  CreateMeetingTypeRequest, 
  MeetingTypesAPI 
} from '@/services/meeting-types-api';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MeetingTypesManagementModalProps {
  open: boolean;
  onClose: () => void;
  onMeetingTypeCreated?: (meetingType: MeetingType) => void;
}

interface FormData extends CreateMeetingTypeRequest {
  id?: string;
}

export function MeetingTypesManagementModal({
  open,
  onClose,
  onMeetingTypeCreated
}: MeetingTypesManagementModalProps) {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    display_name: '',
    description: '',
    system_prompt: MeetingTypesAPI.getDefaultPromptTemplate(),
    output_format: 'json'
  });

  // Load meeting types on mount
  useEffect(() => {
    if (open) {
      loadMeetingTypes();
    }
  }, [open]);

  const loadMeetingTypes = async () => {
    setLoading(true);
    try {
      const { meetingTypes: types, error } = await MeetingTypesAPI.getMeetingTypes();
      if (error) {
        setError(error);
      } else {
        setMeetingTypes(types);
      }
    } catch (err) {
      setError('Failed to load meeting types');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      system_prompt: MeetingTypesAPI.getDefaultPromptTemplate(),
      output_format: 'json'
    });
    setEditingType(null);
    setError(null);
    setSuccess(null);
  };

  const handleCreate = () => {
    resetForm();
    setActiveTab('form');
  };

  const handleEdit = (meetingType: MeetingType) => {
    setFormData({
      id: meetingType.id,
      name: meetingType.name,
      display_name: meetingType.display_name,
      description: meetingType.description || '',
      system_prompt: meetingType.system_prompt,
      output_format: meetingType.output_format
    });
    setEditingType(meetingType);
    setActiveTab('form');
  };

  const handleCopy = (meetingType: MeetingType) => {
    setFormData({
      name: `${meetingType.name}_copy`,
      display_name: `${meetingType.display_name} Copy`,
      description: meetingType.description || '',
      system_prompt: meetingType.system_prompt,
      output_format: meetingType.output_format
    });
    setEditingType(null);
    setActiveTab('form');
  };

  const handleDelete = async (meetingType: MeetingType) => {
    if (!confirm(`Are you sure you want to delete "${meetingType.display_name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const { success, error } = await MeetingTypesAPI.deleteMeetingType(meetingType.id);
      if (error) {
        setError(error);
      } else if (success) {
        setSuccess('Meeting type deleted successfully');
        await loadMeetingTypes();
      }
    } catch (err) {
      setError('Failed to delete meeting type');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Validate form
    if (!formData.name.trim() || !formData.display_name.trim() || !formData.system_prompt.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate name format (no spaces, lowercase, underscores allowed)
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(formData.name)) {
      setError('Name must contain only lowercase letters, numbers, and underscores');
      return;
    }

    // Validate name uniqueness
    const { isValid, error: validationError } = await MeetingTypesAPI.validateMeetingTypeName(
      formData.name, 
      editingType?.id
    );
    if (!isValid) {
      setError(validationError || 'Name already exists');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (editingType) {
        // Update existing
        result = await MeetingTypesAPI.updateMeetingType(editingType.id, formData);
      } else {
        // Create new
        result = await MeetingTypesAPI.createMeetingType(formData);
      }

      if (result.error) {
        setError(result.error);
      } else if (result.meetingType) {
        setSuccess(`Meeting type ${editingType ? 'updated' : 'created'} successfully`);
        await loadMeetingTypes();
        if (!editingType && onMeetingTypeCreated) {
          onMeetingTypeCreated(result.meetingType);
        }
        setActiveTab('list');
        resetForm();
      }
    } catch (err) {
      setError(`Failed to ${editingType ? 'update' : 'create'} meeting type`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setActiveTab('list');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Meeting Types Management</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">Meeting Types</TabsTrigger>
            <TabsTrigger value="form">
              {editingType ? 'Edit Type' : 'Create Type'}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-auto max-h-[60vh]">
            <TabsContent value="list" className="mt-0">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Your Meeting Types</h4>
                  <Button onClick={handleCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Type
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : meetingTypes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No meeting types found. Create your first custom meeting type.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meetingTypes.map((type) => (
                      <Card key={type.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-base">{type.display_name}</CardTitle>
                              <Badge variant="outline">{type.output_format.toUpperCase()}</Badge>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowPromptPreview(
                                  showPromptPreview === type.id ? null : type.id
                                )}
                              >
                                {showPromptPreview === type.id ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(type)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(type)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(type)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground mb-2">
                            {type.description || 'No description provided'}
                          </p>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {type.name}
                          </code>
                          
                          {showPromptPreview === type.id && (
                            <div className="mt-3 p-3 bg-muted rounded-md">
                              <Label className="text-xs font-medium mb-2 block">System Prompt:</Label>
                              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                                {type.system_prompt}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="form" className="mt-0">
              <div className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name (Internal) *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., client_onboarding"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lowercase, underscores only. Used internally.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name *</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="e.g., Client Onboarding"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this meeting type"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="output_format">Output Format</Label>
                  <Select
                    value={formData.output_format}
                    onValueChange={(value: 'json' | 'text' | 'markdown') =>
                      setFormData({ ...formData, output_format: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON (Structured)</SelectItem>
                      <SelectItem value="text">Plain Text</SelectItem>
                      <SelectItem value="markdown">Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="system_prompt">Custom Analysis Instructions *</Label>
                  <Textarea
                    id="system_prompt"
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Enter custom analysis instructions for this meeting type..."
                    rows={12}
                    className="mt-1 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Define how the AI should analyze meetings of this type. The base output structure is provided automatically - 
                    focus on specific analysis requirements, key areas to emphasize, and unique aspects of this meeting type.
                    For example: "Focus on legal compliance issues and client concerns" or "Emphasize sales progression and next steps".
                  </p>
                  
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800">
                        <p className="font-medium mb-1">How it works:</p>
                        <ul className="space-y-1 list-disc list-inside">
                          <li>The system provides a standard output format (summary, action items, participants, etc.)</li>
                          <li>Your custom instructions tell the AI what to focus on for this specific meeting type</li>
                          <li>Think of it as "special instructions" rather than defining the entire output structure</li>
                          <li>Examples: "Prioritize compliance risks", "Track sales objections", "Monitor team blockers"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          {activeTab === 'form' && (
            <>
              <Button variant="outline" onClick={() => setActiveTab('list')}>
                Back to List
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Saving...' : (editingType ? 'Update' : 'Create')}
              </Button>
            </>
          )}
          {activeTab === 'list' && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MeetingTypesManagementModal;
