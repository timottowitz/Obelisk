'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  IconUpload, 
  IconFileText, 
  IconSearch, 
  IconBrain,
  IconFileAnalytics,
  IconChartBar,
  IconAlertCircle,
  IconCheckCircle
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function DocIntelPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Here you would trigger the document analysis
      simulateAnalysis();
    }
  };

  const simulateAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <PageContainer scrollable>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <Heading
            title="Document Intelligence"
            description="AI-powered document analysis and insights extraction"
          />
        </div>
        <Separator />

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="library">Document Library</TabsTrigger>
            <TabsTrigger value="insights">Extracted Insights</TabsTrigger>
            <TabsTrigger value="search">Intelligent Search</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Document for Analysis</CardTitle>
                <CardDescription>
                  Upload legal documents to extract key information, clauses, and insights using AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Click to upload or drag and drop
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PDF, DOCX, TXT up to 50MB
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.txt"
                      />
                      <Button className="mt-4" variant="outline">
                        <IconUpload className="mr-2 h-4 w-4" />
                        Select Document
                      </Button>
                    </label>
                  </div>
                </div>

                {selectedFile && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <IconFileText className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      {isAnalyzing ? (
                        <Badge variant="secondary">Analyzing...</Badge>
                      ) : analysisProgress === 100 ? (
                        <Badge className="bg-green-500">Complete</Badge>
                      ) : (
                        <Badge variant="outline">Ready</Badge>
                      )}
                    </div>

                    {isAnalyzing && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Analysis Progress</span>
                          <span>{analysisProgress}%</span>
                        </div>
                        <Progress value={analysisProgress} />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <IconBrain className="h-5 w-5 text-purple-500" />
                        <span className="text-sm font-medium">Entity Extraction</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Identify parties, dates, amounts, and key terms
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <IconFileAnalytics className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">Clause Detection</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Find and categorize important contract clauses
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2">
                        <IconAlertCircle className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium">Risk Analysis</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Identify potential risks and compliance issues
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Library</CardTitle>
                <CardDescription>
                  Browse and manage your analyzed documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample document entries */}
                  {[
                    { name: 'Service Agreement - ABC Corp.pdf', date: '2024-01-15', status: 'analyzed' },
                    { name: 'NDA - XYZ Partners.docx', date: '2024-01-14', status: 'analyzed' },
                    { name: 'Lease Agreement - Office Space.pdf', date: '2024-01-13', status: 'processing' },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <IconFileText className="h-6 w-6 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">Uploaded on {doc.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.status === 'analyzed' ? (
                          <Badge className="bg-green-100 text-green-800">
                            <IconCheckCircle className="mr-1 h-3 w-3" />
                            Analyzed
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Processing</Badge>
                        )}
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Insights</CardTitle>
                <CardDescription>
                  Key information and patterns discovered across your documents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Common Clauses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Confidentiality</span>
                          <Badge variant="outline">15 docs</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Termination</span>
                          <Badge variant="outline">12 docs</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Indemnification</span>
                          <Badge variant="outline">10 docs</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Risk Indicators</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <IconAlertCircle className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">3 contracts with unlimited liability</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <IconAlertCircle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">5 contracts expiring within 30 days</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <IconCheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">All NDAs properly executed</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Entity Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Organizations Mentioned</span>
                          <span className="text-sm font-medium">47</span>
                        </div>
                        <Progress value={75} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Individuals Referenced</span>
                          <span className="text-sm font-medium">28</span>
                        </div>
                        <Progress value={45} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">Jurisdictions</span>
                          <span className="text-sm font-medium">5</span>
                        </div>
                        <Progress value={20} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Intelligent Document Search</CardTitle>
                <CardDescription>
                  Search across all your documents using natural language queries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="e.g., 'Find all contracts with termination clauses expiring in 2024'"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button>
                    <IconSearch className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Example searches:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Contracts with ABC Corp',
                      'Payment terms over 30 days',
                      'Non-compete clauses',
                      'California jurisdiction',
                    ].map((example, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>

                {searchQuery && (
                  <div className="space-y-3 mt-6">
                    <p className="text-sm font-medium">Search Results</p>
                    {/* Sample search results */}
                    {[
                      { title: 'Service Agreement - Section 4.2', snippet: '...termination may occur with 30 days written notice...', relevance: 95 },
                      { title: 'Master Services Agreement - Article 7', snippet: '...either party may terminate this agreement...', relevance: 88 },
                      { title: 'Partnership Agreement - Clause 12.1', snippet: '...dissolution and termination procedures...', relevance: 76 },
                    ].map((result, index) => (
                      <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{result.title}</p>
                              <p className="text-xs text-gray-500 mt-1">{result.snippet}</p>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              {result.relevance}% match
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}