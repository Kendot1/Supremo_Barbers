import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { DatabaseWiper } from './DatabaseWiper';

interface AdminToolsPageProps {
  onBack: () => void;
}

export function AdminToolsPage({ onBack }: AdminToolsPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFE6] to-[#E8DCC8]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            onClick={onBack}
            variant="ghost"
            className="gap-2 text-[#5C4A3A] hover:text-[#DB9D47]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-[#5C4A3A] mb-2">
              Admin Tools
            </h1>
            <p className="text-[#87765E]">
              Manage system-level operations and database maintenance
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-[#5C4A3A] mb-4">
              Database Management
            </h2>
            <DatabaseWiper />
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-[#5C4A3A] mb-3">
              System Information
            </h2>
            <div className="space-y-2 text-sm text-[#87765E]">
              <p>
                <span className="font-semibold">System:</span> Supremo Barber Management System
              </p>
              <p>
                <span className="font-semibold">Version:</span> 1.0.0
              </p>
              <p>
                <span className="font-semibold">Database:</span> Supabase PostgreSQL
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
