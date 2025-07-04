import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Download,
  Share2,
  Trash2,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  FileText,
  Target,
  MessageSquare,
  Brain,
  MoreVertical,
  X
} from 'lucide-react';
import { CallRecording } from '@/types/callcaps';

const RecordingDetailModal = ({
  recording,
  onClose
}: {
  recording: CallRecording;
  onClose: () => void;
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [isPlaying, setIsPlaying] = useState(false);

  const tabs = [
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare },
    { id: 'actions', label: 'Action Items', icon: Target },
    { id: 'analysis', label: 'Risk Analysis', icon: AlertCircle },
    { id: 'insights', label: 'Insights', icon: Brain }
  ];

  return (
    <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
      <div className='bg-card flex max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[var(--radius)]'>
        {/* Header */}
        <div className='border-border flex items-center justify-between border-b p-6'>
          <div className='flex-1'>
            <h2 className='text-foreground text-2xl font-semibold'>
              {recording.title}
            </h2>
            <div className='text-muted-foreground mt-2 flex items-center space-x-4 text-sm'>
              <span className='flex items-center'>
                <Calendar className='mr-1 h-4 w-4' />
                {recording.date} at {recording.time}
              </span>
              <span className='flex items-center'>
                <Clock className='mr-1 h-4 w-4' />
                {recording.duration}
              </span>
              <span className='flex items-center'>
                <Users className='mr-1 h-4 w-4' />
                {recording.participants.join(', ')}
              </span>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
              <Download className='h-5 w-5' />
            </button>
            <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
              <Share2 className='h-5 w-5' />
            </button>
            <button className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'>
              <Trash2 className='h-5 w-5' />
            </button>
            <button
              onClick={onClose}
              className='text-muted-foreground hover:text-foreground hover:bg-muted rounded-[calc(var(--radius)-2px)] p-2'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>

        <div className='flex flex-1 overflow-hidden'>
          {/* Video Player Sidebar */}
          <div className='bg-muted border-border flex w-80 flex-col border-r p-6'>
            {/* Video Player */}
            <div
              className='relative mb-4 overflow-hidden rounded-[var(--radius)] bg-black'
              style={{ aspectRatio: '16/9' }}
            >
              <div className='absolute inset-0 flex items-center justify-center'>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className='bg-opacity-20 hover:bg-opacity-30 flex h-16 w-16 items-center justify-center rounded-full bg-white'
                >
                  {isPlaying ? (
                    <Pause className='h-8 w-8 text-white' />
                  ) : (
                    <Play className='ml-1 h-8 w-8 text-white' />
                  )}
                </button>
              </div>
              <div className='absolute right-2 bottom-2 left-2'>
                <div className='h-1 w-full rounded-full bg-gray-600'>
                  <div
                    className='h-1 rounded-full bg-blue-500'
                    style={{ width: '30%' }}
                  ></div>
                </div>
              </div>
              <div className='bg-opacity-75 absolute right-4 bottom-4 rounded bg-black px-2 py-1 text-xs text-white'>
                12:30 / {recording.duration}
              </div>
            </div>

            {/* Recording Stats */}
            <div className='space-y-4'>
              <div>
                <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                  Meeting Stats
                </h4>
                <div className='space-y-2'>
                  {recording.transcript && (
                    <>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Words</span>
                        <span className='font-medium'>
                          {recording.transcript.wordCount.toLocaleString()}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Action Items
                        </span>
                        <span className='font-medium'>
                          {recording.transcript.actionItems.length}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Key Topics
                        </span>
                        <span className='font-medium'>
                          {recording.transcript.keyTopics.length}
                        </span>
                      </div>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>Sentiment</span>
                        <span
                          className={`font-medium capitalize ${
                            recording.transcript.sentiment === 'positive'
                              ? 'text-green-600'
                              : recording.transcript.sentiment === 'negative'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {recording.transcript.sentiment}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div>
                <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                  Participants
                </h4>
                <div className='space-y-2'>
                  {recording.participants.map((participant, index) => (
                    <div key={index} className='flex items-center space-x-2'>
                      <div className='bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium'>
                        {participant
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span className='text-foreground/80 text-sm'>
                        {participant}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Topics */}
              {recording.transcript && (
                <div>
                  <h4 className='text-foreground/80 mb-2 text-sm font-medium'>
                    Key Topics
                  </h4>
                  <div className='flex flex-wrap gap-1'>
                    {recording.transcript.keyTopics.map((topic, index) => (
                      <span
                        key={index}
                        className='bg-primary/10 text-primary inline-flex items-center rounded-full px-2 py-1 text-xs font-medium'
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className='flex flex-1 flex-col overflow-hidden'>
            {/* Tabs */}
            <div className='border-border border-b'>
              <nav className='flex space-x-8 px-6'>
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:border-border border-transparent'
                      }`}
                    >
                      <IconComponent className='mr-2 h-4 w-4' />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className='flex-1 overflow-auto p-6'>
              {activeTab === 'summary' && recording.transcript && (
                <div className='space-y-6'>
                  <div>
                    <h3 className='text-foreground mb-3 text-lg font-semibold'>
                      Executive Summary
                    </h3>
                    <div className='prose prose-sm max-w-none'>
                      <p className='text-foreground/80 leading-relaxed'>
                        {recording.transcript.summary}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className='text-foreground mb-3 text-lg font-semibold'>
                      Quick Actions
                    </h3>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                      {recording.transcript.actionItems
                        .slice(0, 4)
                        .map((item, index) => (
                          <div
                            key={index}
                            className='bg-accent border-accent rounded-[var(--radius)] border p-4'
                          >
                            <div className='flex items-start space-x-2'>
                              <CheckCircle className='text-accent-foreground mt-0.5 h-5 w-5 flex-shrink-0' />
                              <div className='flex flex-col'>
                                <p className='text-accent-foreground text-sm font-medium'>
                                  {item.task}
                                </p>
                                <div className='text-accent-foreground/80 mt-1 flex flex-wrap gap-2 text-xs'>
                                  <span>
                                    <span className='font-semibold'>Due:</span>{' '}
                                    {item.dueDate}
                                  </span>
                                  <span>
                                    <span className='font-semibold'>
                                      Assignee:
                                    </span>{' '}
                                    {item.assignee}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transcript' && (
                <div>
                  <div className='mb-4 flex items-center justify-between'>
                    <h3 className='text-foreground text-lg font-semibold'>
                      Full Transcript
                    </h3>
                    <button
                      onClick={(event) => {
                        const transcriptText = `Meeting: ${recording.title}
Date: ${recording.date} at ${recording.time}
Participants: ${recording.participants.join(', ')}
Duration: ${recording.duration}

[00:01] Charles Bennett: Good afternoon everyone, thank you for joining today&apos;s strategy meeting.

[00:15] Sarah Johnson: Great to be here. I&apos;ve prepared the talent acquisition analysis we discussed.

[00:32] Tim Ottowitz: Perfect. Let&apos;s dive into the project execution methodologies and how we can optimize our workflow processes.

[Full transcript would continue with all meeting content...]

--- End of Transcript ---
Generated by Call Caps AI Processing System`;
                        navigator.clipboard
                          .writeText(transcriptText)
                          .then(() => {
                            // Show success feedback
                            const button = event.target as HTMLButtonElement;
                            const originalText = button.innerHTML;
                            button.innerHTML = `<svg class="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                          </svg>Copied!`;
                            button.className = button.className.replace(
                              'text-gray-700 bg-white hover:bg-gray-50',
                              'text-green-700 bg-green-50'
                            );
                            setTimeout(() => {
                              button.innerHTML = originalText;
                              button.className = button.className.replace(
                                'text-green-700 bg-green-50',
                                'text-gray-700 bg-white hover:bg-gray-50'
                              );
                            }, 2000);
                          })
                          .catch(() => {
                            alert('Failed to copy transcript to clipboard');
                          });
                      }}
                      className='inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                    >
                      <svg
                        className='mr-2 h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                        />
                      </svg>
                      Copy Transcript
                    </button>
                  </div>
                  <div className='bg-muted rounded-[var(--radius)] p-6'>
                    <div className='space-y-4'>
                      <div className='space-y-3'>
                        <div className='flex space-x-3'>
                          <span className='text-muted-foreground mt-1 w-16 flex-shrink-0 text-xs'>
                            00:01
                          </span>
                          <div>
                            <span className='text-primary font-medium'>
                              Charles Bennett:
                            </span>
                            <span className='text-foreground/80 ml-2'>
                              Good afternoon everyone, thank you for joining
                              today&apos;s strategy meeting.
                            </span>
                          </div>
                        </div>
                        <div className='flex space-x-3'>
                          <span className='text-muted-foreground mt-1 w-16 flex-shrink-0 text-xs'>
                            00:15
                          </span>
                          <div>
                            <span className='text-success font-medium'>
                              Sarah Johnson:
                            </span>
                            <span className='text-foreground/80 ml-2'>
                              Great to be here. I&apos;ve prepared the talent
                              acquisition analysis we discussed.
                            </span>
                          </div>
                        </div>
                        <div className='flex space-x-3'>
                          <span className='text-muted-foreground mt-1 w-16 flex-shrink-0 text-xs'>
                            00:32
                          </span>
                          <div>
                            <span className='text-accent-foreground font-medium'>
                              Tim Ottowitz:
                            </span>
                            <span className='text-foreground/80 ml-2'>
                              Perfect. Let&apos;s dive into the project execution
                              methodologies and how we can optimize our workflow
                              processes.
                            </span>
                          </div>
                        </div>
                        <div className='py-4 text-center'>
                          <span className='text-muted-foreground text-sm italic'>
                            ... showing first few lines. Full transcript
                            continues below ...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && recording.transcript && (
                <div>
                  <h3 className='text-foreground mb-4 text-lg font-semibold'>
                    Action Items & Follow-ups
                  </h3>
                  <div className='space-y-4'>
                    {recording.transcript.actionItems.map((item, index) => (
                      <div
                        key={index}
                        className='bg-card border-border rounded-lg border p-4 transition-shadow hover:shadow-sm'
                      >
                        <div className='flex items-start space-x-3'>
                          <input
                            type='checkbox'
                            className='text-primary mt-1 h-4 w-4 rounded border-gray-300'
                          />
                          <div className='flex-1'>
                            <p className='text-foreground font-medium'>
                              {item.task}
                            </p>
                            <div className='mt-2 flex items-center space-x-4 text-sm text-gray-500'>
                              <span>Priority: High</span>
                              <span>Due: June 10th</span>
                              <span>Assigned: TBD</span>
                            </div>
                          </div>
                          <button className='text-gray-400 hover:text-gray-600'>
                            <MoreVertical className='h-4 w-4' />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'analysis' && (
                <div>
                  <h3 className='text-foreground mb-4 text-lg font-semibold'>
                    Risk Analysis & Compliance
                  </h3>
                  <div className='space-y-6'>
                    <div className='bg-destructive/10 border-destructive/30 rounded-[var(--radius)] border p-4'>
                      <h4 className='text-destructive mb-2 font-medium'>
                        High Priority Risks
                      </h4>
                      <ul className='text-destructive space-y-2 text-sm'>
                        <li>
                          • Client deadline requirements need immediate
                          attention
                        </li>
                        <li>
                          • Resource allocation conflicts with existing
                          commitments
                        </li>
                      </ul>
                    </div>

                    <div className='bg-accent/10 border-accent/30 rounded-[var(--radius)] border p-4'>
                      <h4 className='text-accent-foreground mb-2 font-medium'>
                        Medium Priority Items
                      </h4>
                      <ul className='text-accent-foreground space-y-2 text-sm'>
                        <li>
                          • Technology integration timeline needs monitoring
                        </li>
                        <li>• Staff training requirements for new processes</li>
                      </ul>
                    </div>

                    <div className='bg-primary/10 border-primary/30 rounded-[var(--radius)] border p-4'>
                      <h4 className='text-primary mb-2 font-medium'>
                        Compliance Notes
                      </h4>
                      <ul className='text-primary space-y-2 text-sm'>
                        <li>
                          • Attorney-client privilege maintained throughout
                          discussion
                        </li>
                        <li>
                          • All documentation requirements noted for file
                          retention
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div>
                  <h3 className='text-foreground mb-4 text-lg font-semibold'>
                    AI-Generated Insights
                  </h3>
                  <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='bg-primary/10 rounded-[var(--radius)] p-4'>
                      <h4 className='text-primary mb-2 font-medium'>
                        Meeting Effectiveness
                      </h4>
                      <div className='text-primary text-2xl font-bold'>
                        8.5/10
                      </div>
                      <p className='text-primary mt-1 text-sm'>
                        Well-structured with clear outcomes
                      </p>
                    </div>

                    <div className='bg-success/10 rounded-[var(--radius)] p-4'>
                      <h4 className='text-success mb-2 font-medium'>
                        Action Clarity
                      </h4>
                      <div className='text-success text-2xl font-bold'>92%</div>
                      <p className='text-success mt-1 text-sm'>
                        Clear actionable items identified
                      </p>
                    </div>

                    <div className='bg-accent/10 rounded-[var(--radius)] p-4'>
                      <h4 className='text-accent-foreground mb-2 font-medium'>
                        Participation Balance
                      </h4>
                      <div className='text-accent-foreground text-2xl font-bold'>
                        Good
                      </div>
                      <p className='text-accent-foreground mt-1 text-sm'>
                        Balanced discussion among participants
                      </p>
                    </div>

                    <div className='bg-accent/10 rounded-[var(--radius)] p-4'>
                      <h4 className='text-accent-foreground mb-2 font-medium'>
                        Follow-up Required
                      </h4>
                      <div className='text-accent-foreground text-2xl font-bold'>
                        {recording.transcript?.actionItems.length || 0}
                      </div>
                      <p className='text-accent-foreground mt-1 text-sm'>
                        Items need follow-up
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingDetailModal;
