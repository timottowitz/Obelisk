'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  Scale, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  Briefcase,
  Building,
  MapPin,
  DollarSign,
  Gavel,
  Activity,
  TrendingUp,
  Filter,
  Search,
  Bell,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Document, Entity } from '@/types/doc-intel';

// Bennett Legal specific types
interface BennettLegalMetadata {
  taxonomy_category: string;
  document_type: string;
  litigation_type: 'personal_injury' | 'solar' | 'employment' | 'other';
  workflow_routing: 'paralegal' | 'lawyer' | 'specialist';
  priority_level: 'urgent' | 'high' | 'normal' | 'low';
  confidentiality_level: 'public' | 'confidential' | 'privileged' | 'work_product';
  classification_confidence: number;
  entity_completeness_score: number;
  validation_required: boolean;
}

interface AutomatedTask {
  id: string;
  task_type: string;
  title: string;
  description: string;
  assigned_to: string;
  due_date: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  metadata: Record<string, any>;
}

interface CalendarEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  attendees: string[];
  metadata: Record<string, any>;
}

interface BennettLegalWorkbenchProps {
  document: Document & { legal_metadata?: BennettLegalMetadata };
  entities: Entity[];
  automatedTasks?: AutomatedTask[];
  calendarEvents?: CalendarEvent[];
  onTaskUpdate?: (taskId: string, updates: Partial<AutomatedTask>) => void;
  onEventUpdate?: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onWorkflowAction?: (action: string, data: any) => void;
  className?: string;
}

export function BennettLegalWorkbench({
  document,
  entities,
  automatedTasks = [],
  calendarEvents = [],
  onTaskUpdate,
  onEventUpdate,
  onWorkflowAction,
  className
}: BennettLegalWorkbenchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState('overview');

  const legalMetadata = document.legal_metadata;

  // Bennett Legal entity categorization based on 15 models
  const categorizedEntities = useMemo(() => {
    const categories = {
      people: entities.filter(e => ['doctor', 'attorney', 'plaintiff', 'defendant', 'sender'].includes(e.label)),
      organizations: entities.filter(e => ['insurance_company', 'medical_facility', 'court', 'solar_company'].includes(e.label)),
      dates: entities.filter(e => ['document_date', 'event_date'].includes(e.label)),
      financial: entities.filter(e => ['settlement_amount', 'policy_number'].includes(e.label)),
      medical: entities.filter(e => ['injury_type'].includes(e.label)),
      legal: entities.filter(e => ['case_number'].includes(e.label)),
      other: entities.filter(e => !['doctor', 'attorney', 'plaintiff', 'defendant', 'sender', 'insurance_company', 'medical_facility', 'court', 'solar_company', 'document_date', 'event_date', 'settlement_amount', 'policy_number', 'injury_type', 'case_number'].includes(e.label))
    };
    return categories;
  }, [entities]);

  // Task statistics
  const taskStats = useMemo(() => {
    const pending = automatedTasks.filter(t => t.status === 'pending').length;
    const inProgress = automatedTasks.filter(t => t.status === 'in_progress').length;
    const completed = automatedTasks.filter(t => t.status === 'completed').length;
    const overdue = automatedTasks.filter(t => 
      t.status !== 'completed' && new Date(t.due_date) < new Date()
    ).length;
    
    return { pending, inProgress, completed, overdue, total: automatedTasks.length };
  }, [automatedTasks]);

  // Priority and confidentiality color schemes
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidentialityColor = (level: string) => {
    switch (level) {
      case 'privileged': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'work_product': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'confidential': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'public': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLitigationTypeIcon = (type: string) => {
    switch (type) {
      case 'personal_injury': return <Scale className="h-4 w-4" />;
      case 'solar': return <Activity className="h-4 w-4" />;
      case 'employment': return <Briefcase className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Filtered tasks based on status filter
  const filteredTasks = useMemo(() => {
    return automatedTasks.filter(task => {
      if (taskFilter === 'all') return true;
      return task.status === taskFilter;
    });
  }, [automatedTasks, taskFilter]);

  // Handle task status updates
  const handleTaskStatusUpdate = (taskId: string, newStatus: string) => {
    if (onTaskUpdate) {
      onTaskUpdate(taskId, { status: newStatus as any });
    }
  };

  return (
    <div className={`flex flex-col space-y-6 ${className}`}>
      {/* Document Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-2xl font-bold">{document.filename}</h1>
            {legalMetadata && (
              <div className="flex items-center space-x-2">
                {getLitigationTypeIcon(legalMetadata.litigation_type)}
                <Badge className={getPriorityColor(legalMetadata.priority_level)}>
                  {legalMetadata.priority_level.toUpperCase()}
                </Badge>
                <Badge className={getConfidentialityColor(legalMetadata.confidentiality_level)}>
                  {legalMetadata.confidentiality_level.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
          
          {legalMetadata && (
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Building className="h-4 w-4" />
                <span>{legalMetadata.taxonomy_category}</span>
              </span>
              <span className="flex items-center space-x-1">
                <FileText className="h-4 w-4" />
                <span>{legalMetadata.document_type}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Route to: {legalMetadata.workflow_routing}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quality Metrics */}
      {legalMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Document Quality Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Classification Confidence</span>
                  <span>{Math.round(legalMetadata.classification_confidence * 100)}%</span>
                </div>
                <Progress value={legalMetadata.classification_confidence * 100} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Entity Completeness</span>
                  <span>{Math.round(legalMetadata.entity_completeness_score * 100)}%</span>
                </div>
                <Progress value={legalMetadata.entity_completeness_score * 100} className="h-2" />
              </div>

              <div className="flex items-center justify-center">
                {legalMetadata.validation_required ? (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Review Required</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Processing Complete</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Entities ({entities.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({taskStats.total})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar ({calendarEvents.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Entity Summary Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>People</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorizedEntities.people.length}</div>
                <p className="text-xs text-muted-foreground">
                  Doctors, Attorneys, Parties
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Organizations</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorizedEntities.organizations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Insurance, Medical, Legal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Financial</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorizedEntities.financial.length}</div>
                <p className="text-xs text-muted-foreground">
                  Settlements, Policies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Important Dates</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categorizedEntities.dates.length}</div>
                <p className="text-xs text-muted-foreground">
                  Documents, Events
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Task Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow Status</CardTitle>
              <CardDescription>Automated tasks and calendar events generated from this document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{taskStats.pending}</div>
                  <div className="text-sm text-muted-foreground">Pending Tasks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{taskStats.overdue}</div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* High Priority Items */}
          {(filteredTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length > 0 || 
            calendarEvents.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span>Attention Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* High Priority Tasks */}
                  {filteredTasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 3).map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge className={getPriorityColor(task.priority)} variant="outline">
                            {task.priority.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{task.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                          <span>Assigned to: {task.assigned_to}</span>
                          <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}>
                        Start Task
                      </Button>
                    </div>
                  ))}

                  {/* Upcoming Calendar Events */}
                  {calendarEvents.slice(0, 2).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{event.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(event.start_date).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Entities Tab */}
        <TabsContent value="entities" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="people">People</SelectItem>
                  <SelectItem value="organizations">Organizations</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="dates">Dates</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entity Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(categorizedEntities).map(([category, categoryEntities]) => {
              if (entityFilter !== 'all' && entityFilter !== category) return null;
              if (categoryEntities.length === 0) return null;

              const filteredCategoryEntities = categoryEntities.filter(entity => 
                !searchQuery || 
                entity.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
                entity.label.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredCategoryEntities.length === 0) return null;

              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="capitalize">{category} ({filteredCategoryEntities.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {filteredCategoryEntities.map((entity) => (
                          <div key={entity.id} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="outline">{entity.label}</Badge>
                                {entity.is_objective_truth && (
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium">{entity.value}</p>
                              {entity.context_snippet && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  "{entity.context_snippet}"
                                </p>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Page {(entity as any).page_number || 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => onWorkflowAction?.('generate_tasks', { document_id: document.id })}>
              Generate More Tasks
            </Button>
          </div>

          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(task.priority)} variant="outline">
                        {task.priority.toUpperCase()}
                      </Badge>
                      <span>{task.title}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {task.status === 'pending' && (
                        <Button size="sm" onClick={() => handleTaskStatusUpdate(task.id, 'in_progress')}>
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button size="sm" onClick={() => handleTaskStatusUpdate(task.id, 'completed')}>
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>{task.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Assigned to: {task.assigned_to}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <FileText className="h-4 w-4" />
                      <span>Type: {task.task_type}</span>
                    </span>
                  </div>
                  {new Date(task.due_date) < new Date() && task.status !== 'completed' && (
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This task is overdue and requires immediate attention.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="space-y-4">
            {calendarEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5" />
                      <span>{event.title}</span>
                    </CardTitle>
                    <Badge variant="outline">{event.event_type}</Badge>
                  </div>
                  <CardDescription>{event.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(event.start_date).toLocaleString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>Attendees: {event.attendees.join(', ')}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}