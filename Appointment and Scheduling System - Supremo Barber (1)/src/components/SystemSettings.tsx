import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { Clock, Download, Upload, Save, Database, Server } from "lucide-react";
import { toast } from "sonner";
import API from "../services/api.service";
import { ImageUploadTest } from "./ImageUploadTest";
import { Alert, AlertDescription } from "./ui/alert";
import { convertToCSV } from "./utils/exportUtils";
import { ZipWriter, BlobWriter, TextReader } from "@zip.js/zip.js";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    openTime: "09:00",
    closeTime: "18:00",
    loyaltyPointsPerVisit: 10,
    pointsPerDollar: 1,
    cancellationDays: 2,
    downPaymentPercentage: 50,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch settings from database on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const data = await API.settings.get();
        if (data) {
          setSettings({
            openTime: data.businessHours?.openTime || "09:00",
            closeTime: data.businessHours?.closeTime || "18:00",
            loyaltyPointsPerVisit: data.loyaltySettings?.pointsPerVisit || 10,
            pointsPerDollar: data.loyaltySettings?.pointsPerDollar || 1,
            cancellationDays: data.bookingPolicies?.cancellationNoticeDays || 2,
            downPaymentPercentage: data.bookingPolicies?.downPaymentPercentage || 50,
          });
          setIsConnected(true);
        }
      } catch (error) {
        // Silently handle - settings endpoint is optional

        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await API.settings.update({
        businessHours: {
          openTime: settings.openTime,
          closeTime: settings.closeTime,
        },
        loyaltySettings: {
          pointsPerVisit: settings.loyaltyPointsPerVisit,
          pointsPerDollar: settings.pointsPerDollar,
        },
        bookingPolicies: {
          cancellationNoticeDays: settings.cancellationDays,
          downPaymentPercentage: settings.downPaymentPercentage,
        },
      });
      setIsConnected(true); // Mark as connected after successful save
      toast.success("Settings saved to database successfully!");
    } catch (error) {
      console.error('Error saving settings:', error);
      setIsConnected(false);
      toast.error("Failed to save settings to database");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      // Use standard default password for automated creation
      const password = "Supremo_Backup_Admin";
      
      setIsSaving(true);
      toast.info("Gathering database files...", { id: "backup-toast" });

      // Fetch all system data
      const [users, barbers, appointments, services, reviews, payments, logsData] = await Promise.all([
        API.users.getAll().catch(() => []),
        API.barbers.getAll().catch(() => []),
        API.appointments.getAll().catch(() => []),
        API.services.getAll().catch(() => []),
        API.reviews.getAll().catch(() => []),
        API.payments.getAll().catch(() => []),
        API.auditLogs.getAll().catch(() => [])
      ]);

      const zipWriter = new ZipWriter(new BlobWriter("application/zip"), {
        password: password,
        zipCrypto: true, // Crucial for native Windows Explorer compatibility
      });

      toast.loading("Compressing and locking database...", { id: "backup-toast" });

      // Helper to dynamically convert to CSV based on the object's keys
      const addCsvToZip = async (filename: string, dataArray: any[]) => {
        if (!dataArray || dataArray.length === 0) return;
        const headers = Object.keys(dataArray[0]);
        const csvString = convertToCSV(dataArray, headers);
        await zipWriter.add(filename, new TextReader(csvString));
      };

      await addCsvToZip("users.csv", users);
      await addCsvToZip("barbers.csv", barbers);
      await addCsvToZip("appointments.csv", appointments);
      await addCsvToZip("services.csv", services);
      await addCsvToZip("reviews.csv", reviews);
      await addCsvToZip("payments.csv", payments);
      await addCsvToZip("audit_logs.csv", logsData);

      // Add settings as JSON metadata
      const settingsData = {
        version: "3.0-zip-encrypted",
        timestamp: new Date().toISOString(),
        settings
      };
      await zipWriter.add("system_settings.json", new TextReader(JSON.stringify(settingsData, null, 2)));
      
      const blob = await zipWriter.close();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supremo-database-secure-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Password-Protected ZIP Database created successfully!", { id: "backup-toast" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create locked zip backup", { id: "backup-toast" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Restore logic using ZipReader could be added here, but for now we'll reset
    // since restoring an entire normalized relational DB requires server integration.
    e.target.value = "";
    toast.error("Database Restoration requires Admin CLI currently. Please un-zip your files manually and import them onto the SQL Console.", { duration: 6000 });
  };

  return (
    <div className="space-y-6">


      {/* Working Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <div>
              <CardTitle>Working Hours</CardTitle>
              <CardDescription>
                Configure shop operating hours
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openTime">Opening Time</Label>
              <Input
                id="openTime"
                type="time"
                value={settings.openTime}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    openTime: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeTime">Closing Time</Label>
              <Input
                id="closeTime"
                type="time"
                value={settings.closeTime}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    closeTime: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Policies</CardTitle>
          <CardDescription>
            Configure booking and cancellation rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellationDays">
              Cancellation Notice (Days)
            </Label>
            <Input
              id="cancellationDays"
              type="number"
              value={settings.cancellationDays}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  cancellationDays: parseInt(e.target.value),
                })
              }
            />
            <p className="text-sm text-slate-500">
              Customers must cancel at least this many days
              before appointment
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="downPayment">
              Down Payment (%)
            </Label>
            <Input
              id="downPayment"
              type="number"
              value={settings.downPaymentPercentage}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  downPaymentPercentage: parseInt(
                    e.target.value,
                  ),
                })
              }
            />
          </div>

        </CardContent>
      </Card>

      {/* Database Management & Backups */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            <div>
              <CardTitle>Database & Backups</CardTitle>
              <CardDescription>
                Manage system data and export backup configurations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <div className="flex-1 space-y-1">
              <Label>Export Backup</Label>
              <p className="text-sm text-slate-500">
                Download a Password-Locked ZIP file containing .csv files of every database table.
              </p>
            </div>
            <Button onClick={handleCreateBackup} variant="outline" disabled={isSaving}>
              <Download className="w-4 h-4 mr-2" />
              Download Config
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
            <div className="flex-1 space-y-1">
              <Label>Restore Backup</Label>
              <p className="text-sm text-slate-500">
                Data restore from ZIP format is intended for direct backend deployment.
              </p>
            </div>
            <div className="relative">
              <Input
                type="file"
                accept=".zip"
                className="hidden"
                id="restore-file"
                onChange={handleRestoreBackup}
              />
              <Label
                htmlFor="restore-file"
                className="cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Config
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg" disabled={isSaving || isLoading}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving to Database...' : isLoading ? 'Loading...' : 'Save All Settings'}
        </Button>
      </div>



    </div>
  );
}