/**
 * Meeting Insights Component
 * AI-powered insights and analytics for meeting intelligence
 * Provides actionable insights from meeting data
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Users,
  MessageSquare,
  Target,
  BarChart3,
  Activity
} from 'lucide-react';

interface MeetingInsight {
  id: string;
  type: 'trend' | 'recommendation' | 'alert' | 'achievement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  metadata?: any;
}

interface TopicTrend {
  topic: string;
  mentions: number;
  trend: 'rising' | 'stable' | 'declining';
  percentage: number;
}

interface ParticipationMetric {
  participantName: string;
  talkTime: number; // percentage
  contributionScore: number;
  meetingsAttended: number;
}

interface MeetingInsightsData {
  insights: MeetingInsight[];
  topicTrends: TopicTrend[];
  participationMetrics: ParticipationMetric[];
  productivityScores: {
    weeklyAverage: number;
    monthlyAverage: number;
    trend: 'up' | 'down' | 'stable';
  };
  actionItemCompletion: {
    completed: number;
    total: number;
    averageCompletionTime: number; // days
  };
}

export function MeetingInsights() {
  const [data, setData] = useState<MeetingInsightsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('insights');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const mockData: MeetingInsightsData = {
        insights: [
          {
            id: '1',
            type: 'trend',
            title: 'Meeting Length Increasing',
            description: 'Average meeting duration has increased by 23% over the past month. Consider setting time limits.',
            impact: 'medium',
            actionable: true,
          },
          {
            id: '2',
            type: 'recommendation',
            title: 'Optimize Client Calls',
            description: 'Legal client calls show 85% action item completion. Consider this format for other meeting types.',
            impact: 'high',
            actionable: true,
          },
          {
            id: '3',
            type: 'alert',
            title: 'Low Participation Detected',
            description: '3 meetings this week had participants with less than 10% talk time.',
            impact: 'medium',
            actionable: true,
          },
          {
            id: '4',
            type: 'achievement',
            title: 'Action Item Success',
            description: 'Your team completed 94% of action items this month - above industry average!',
            impact: 'high',
            actionable: false,
          },
        ],
        topicTrends: [
          { topic: 'Contract Review', mentions: 34, trend: 'rising', percentage: 15.2 },
          { topic: 'Client Onboarding', mentions: 28, trend: 'stable', percentage: 12.5 },
          { topic: 'Case Strategy', mentions: 22, trend: 'rising', percentage: 9.8 },
          { topic: 'Budget Planning', mentions: 18, trend: 'declining', percentage: 8.1 },
          { topic: 'Team Coordination', mentions: 15, trend: 'stable', percentage: 6.7 },
        ],
        participationMetrics: [
          { participantName: 'Sarah Wilson', talkTime: 35.2, contributionScore: 8.7, meetingsAttended: 23 },
          { participantName: 'Mike Johnson', talkTime: 28.6, contributionScore: 7.9, meetingsAttended: 19 },
          { participantName: 'Emily Chen', talkTime: 22.1, contributionScore: 8.2, meetingsAttended: 21 },
          { participantName: 'David Brown', talkTime: 14.1, contributionScore: 6.5, meetingsAttended: 17 },
        ],
        productivityScores: {
          weeklyAverage: 7.8,
          monthlyAverage: 7.5,
          trend: 'up',
        },
        actionItemCompletion: {
          completed: 267,
          total: 284,
          averageCompletionTime: 3.2,
        },
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'recommendation': return Brain;
      case 'alert': return AlertCircle;
      case 'achievement': return CheckCircle2;
      default: return Activity;
    }
  };

  const getInsightColor = (type: string, impact: string) => {
    if (type === 'achievement') return 'text-green-600';
    if (type === 'alert') return 'text-red-600';
    if (impact === 'high') return 'text-orange-600';
    return 'text-blue-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '↗️';
      case 'declining': return '↘️';
      default: return '→';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <CardTitle>AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sm text-muted-foreground">Failed to load insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Updated 5 min ago
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="topics">Topics</TabsTrigger>
            <TabsTrigger value="participation">People</TabsTrigger>
            <TabsTrigger value="productivity">Metrics</TabsTrigger>
          </TabsList>

          {/* Key Insights */}
          <TabsContent value="insights" className="space-y-4">
            {data.insights.map((insight) => {
              const Icon = getInsightIcon(insight.type);
              const iconColor = getInsightColor(insight.type, insight.impact);
              
              return (
                <div key={insight.id} className="p-4 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${iconColor}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <Badge 
                          variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {insight.impact}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      {insight.actionable && (
                        <Button size="sm" variant="outline">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* Topic Trends */}
          <TabsContent value="topics" className="space-y-4">
            <div className="space-y-3">
              {data.topicTrends.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getTrendIcon(topic.trend)}</span>
                    <div>
                      <div className="font-medium text-sm">{topic.topic}</div>
                      <div className="text-xs text-muted-foreground">
                        {topic.mentions} mentions ({topic.percentage}%)
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant={topic.trend === 'rising' ? 'default' : topic.trend === 'declining' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {topic.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Participation Metrics */}
          <TabsContent value="participation" className="space-y-4">
            <div className="space-y-3">
              {data.participationMetrics.map((participant, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{participant.participantName}</div>
                    <Badge variant="outline" className="text-xs">
                      Score: {participant.contributionScore}/10
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Talk Time</span>
                      <span>{participant.talkTime}%</span>
                    </div>
                    <Progress value={participant.talkTime} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {participant.meetingsAttended} meetings attended
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Productivity Metrics */}
          <TabsContent value="productivity" className="space-y-4">
            <div className="grid gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Productivity Score
                  </h4>
                  <Badge 
                    variant={data.productivityScores.trend === 'up' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {data.productivityScores.trend === 'up' ? '↗️' : data.productivityScores.trend === 'down' ? '↘️' : '→'} 
                    {data.productivityScores.trend}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{data.productivityScores.weeklyAverage}/10</div>
                <div className="text-xs text-muted-foreground">
                  Monthly average: {data.productivityScores.monthlyAverage}/10
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center mb-2">
                  <Target className="h-4 w-4 mr-2" />
                  <h4 className="font-medium text-sm">Action Item Completion</h4>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Completed</span>
                  <span>{data.actionItemCompletion.completed}/{data.actionItemCompletion.total}</span>
                </div>
                <Progress 
                  value={(data.actionItemCompletion.completed / data.actionItemCompletion.total) * 100} 
                  className="mb-2" 
                />
                <div className="text-xs text-muted-foreground">
                  Average completion: {data.actionItemCompletion.averageCompletionTime} days
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}