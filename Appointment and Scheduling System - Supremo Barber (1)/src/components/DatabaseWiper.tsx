import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DatabaseWiper() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDeleteAllData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-70e1fc66/api/admin/delete-all-data`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Database wiped successfully! All data has been deleted.');
       
        
        // Reload the page after a short delay to reset the application state
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(`Failed to delete data: ${result.error}`);
        console.error('❌ Database deletion failed:', result.error);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      console.error('❌ Error deleting database:', error);
    } finally {
      setIsDeleting(false);
      setConfirmText('');
    }
  };

  return (
    <div className="p-6 border-2 border-red-200 rounded-lg bg-red-50">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
          <p className="text-sm text-red-700 mt-1">
            Delete all data from the database. This action cannot be undone.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete All Database Data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-600">
                Are you absolutely sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will permanently delete <strong>ALL DATA</strong> from your database including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All users and authentication accounts</li>
                  <li>All barbers</li>
                  <li>All services</li>
                  <li>All appointments</li>
                  <li>All payment records</li>
                </ul>
                <p className="text-red-600 font-semibold mt-3">
                  This action cannot be undone!
                </p>
                <div className="mt-4">
                  <label className="text-sm font-medium">
                    Type <span className="font-mono font-bold">DELETE ALL DATA</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="DELETE ALL DATA"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmText('')}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAllData}
                disabled={isDeleting || confirmText !== 'DELETE ALL DATA'}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Deleting...' : 'Delete All Data'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <p className="text-xs text-red-600">
          ⚠️ Warning: After deletion, the page will automatically refresh and you'll need to register a new admin account.
        </p>
      </div>
    </div>
  );
}

