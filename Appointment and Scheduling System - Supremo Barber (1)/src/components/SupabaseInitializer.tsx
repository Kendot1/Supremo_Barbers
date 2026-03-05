import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import API from '../services/api.service';

export function SupabaseInitializer() {
  const [initialized, setInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [initData, setInitData] = useState<any>(null);

  useEffect(() => {
    checkInitialization();
  }, []);

  const checkInitialization = async () => {
    try {
      setLoading(true);
      // Try to fetch settings to check if system is initialized
      const settings = await API.settings.get();
      if (settings) {
        setInitialized(true);
      }
    } catch (err) {
      // System not initialized or error
      setInitialized(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await API.initialize();
      if (data) {
        setInitData(data);
        setInitialized(true);
      } else {
        setError('Failed to initialize system');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !initData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#DB9D47] mx-auto mb-4"></div>
            <h2 className="text-xl mb-2">Checking System Status...</h2>
            <p className="text-gray-600">Please wait</p>
          </div>
        </Card>
      </div>
    );
  }

  if (initialized && !initData) {
    return null; // System is ready, don't show anything
  }

  if (initData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl mb-2">System Initialized Successfully!</h2>
            <p className="text-gray-600 mb-6">Supremo Barber Management System is ready to use</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-4 text-lg">Initial Setup Complete</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Users Created:</span>
                <span className="font-medium">{initData.users}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Barbers Created:</span>
                <span className="font-medium">{initData.barbers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Services Created:</span>
                <span className="font-medium">{initData.services}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Version:</span>
                <span className="font-medium">{initData.version}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3 text-amber-900">Super Admin Credentials</h3>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-amber-900">{initData.superAdminCredentials?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Password:</span>
                <span className="font-medium text-amber-900">{initData.superAdminCredentials?.password}</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => {
              setInitData(null);
              window.location.reload();
            }}
            className="w-full bg-[#DB9D47] hover:bg-[#c28a3d] text-white"
          >
            Continue to Application
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DB9D47]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="text-2xl mb-2">Initialize System</h2>
          <p className="text-gray-600 mb-6">
            Welcome to Supremo Barber Management System. 
            Click the button below to set up the database with initial data.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <Button 
            onClick={handleInitialize}
            disabled={loading}
            className="w-full bg-[#DB9D47] hover:bg-[#c28a3d] text-white"
          >
            {loading ? 'Initializing...' : 'Initialize Database'}
          </Button>

          <p className="text-xs text-gray-500 mt-4">
            This will create demo data including super admin account, barbers, and services.
          </p>
        </div>
      </Card>
    </div>
  );
}
