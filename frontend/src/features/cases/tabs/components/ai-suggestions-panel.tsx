// frontend/src/features/cases/tabs/components/ai-suggestions-panel.tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lightbulb } from 'lucide-react';

interface AISuggestion {
  name: string;
  description: string;
}

interface AISuggestionsPanelProps {
  suggestions: AISuggestion[];
  isLoading: boolean;
  onAccept: (suggestion: AISuggestion) => void;
  onDismiss: () => void;
}

export default function AISuggestionsPanel({
  suggestions,
  isLoading,
  onAccept,
  onDismiss,
}: AISuggestionsPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <p className="ml-4 text-gray-600">Generating AI suggestions...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="mt-6 bg-blue-50 border-blue-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-lg text-blue-800">AI Suggestions</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-4 bg-white rounded-lg border border-gray-200 flex flex-col justify-between"
            >
              <div>
                <h4 className="font-semibold text-gray-800">{suggestion.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
              </div>
              <div className="mt-4 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAccept(suggestion)}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
