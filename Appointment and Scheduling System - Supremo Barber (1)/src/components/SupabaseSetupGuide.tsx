import React from 'react';
import { AlertCircle, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

export function SupabaseSetupGuide() {
  const sqlCommand = `-- Allow anyone to insert reviews
CREATE POLICY "Allow public to insert reviews"
ON reviews
FOR INSERT
TO public
WITH CHECK (true);

-- Allow users to read all reviews
CREATE POLICY "Allow public to read reviews"
ON reviews
FOR SELECT
TO public
USING (true);`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlCommand);
    toast.success('SQL command copied to clipboard!');
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
          <div>
            <CardTitle className="text-orange-900">Database Setup Required</CardTitle>
            <CardDescription className="text-orange-700">
              Your Supabase database needs Row-Level Security (RLS) policies configured to allow review submissions.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border-2 border-orange-300">
          <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
            📋 Follow These Steps:
          </h3>
          
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-900 rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="text-gray-900 font-medium">Open Supabase Dashboard</p>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                >
                  Go to Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-900 rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="text-gray-900 font-medium">Navigate to SQL Editor</p>
                <p className="text-gray-600 text-xs mt-1">Click "SQL Editor" in the left sidebar</p>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-900 rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="text-gray-900 font-medium">Create New Query</p>
                <p className="text-gray-600 text-xs mt-1">Click the "+ New Query" button</p>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-900 rounded-full flex items-center justify-center text-xs font-bold">
                4
              </span>
              <div className="flex-1">
                <p className="text-gray-900 font-medium mb-2">Copy and Run This SQL</p>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-md text-xs font-mono relative">
                  <pre className="whitespace-pre-wrap overflow-x-auto">
                    {sqlCommand}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
                    onClick={handleCopySQL}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-900 rounded-full flex items-center justify-center text-xs font-bold">
                5
              </span>
              <div>
                <p className="text-gray-900 font-medium">Run the Query</p>
                <p className="text-gray-600 text-xs mt-1">Click "Run" button or press Ctrl+Enter</p>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-green-200 text-green-900 rounded-full flex items-center justify-center text-xs font-bold">
                <CheckCircle className="w-4 h-4" />
              </span>
              <div>
                <p className="text-gray-900 font-medium">Done! Try submitting a review again</p>
                <p className="text-gray-600 text-xs mt-1">Refresh this page and submit your review</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Alternative:</strong> If you want to quickly disable RLS for testing, run this instead: 
              <code className="bg-blue-100 px-2 py-0.5 rounded ml-1 font-mono text-xs">
                ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
              </code>
              <br />
              <span className="text-red-600">(⚠️ Less secure - not recommended for production)</span>
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCopySQL}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy SQL Command
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            className="border-orange-600 text-orange-600 hover:bg-orange-50"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Supabase Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

