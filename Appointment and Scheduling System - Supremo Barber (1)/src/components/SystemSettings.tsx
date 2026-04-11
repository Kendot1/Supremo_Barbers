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
import { Clock, Award, Bell, Save, Database, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import API from "../services/api.service";
import { DatabaseWiper } from "./DatabaseWiper";
import { ImageUploadTest } from "./ImageUploadTest";
import { Alert, AlertDescription } from "./ui/alert";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    openTime: "09:00",
    closeTime: "18:00",
    bookingsPerBarber: 5,
    loyaltyPointsPerVisit: 10,
    pointsPerDollar: 1,
    cancellationDays: 2,
    downPaymentPercentage: 50,
    emailNotifications: true,
    smsNotifications: false,
    reminderHours: 24,
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
            bookingsPerBarber: data.bookingLimits?.maxBookingsPerBarber || 5,
            loyaltyPointsPerVisit: data.loyaltySettings?.pointsPerVisit || 10,
            pointsPerDollar: data.loyaltySettings?.pointsPerDollar || 1,
            cancellationDays: data.bookingPolicies?.cancellationNoticeDays || 2,
            downPaymentPercentage: data.bookingPolicies?.downPaymentPercentage || 50,
            emailNotifications: data.notifications?.emailEnabled ?? true,
            smsNotifications: data.notifications?.smsEnabled ?? false,
            reminderHours: data.notifications?.reminderHours || 24,
          });
          setIsConnected(true);
        }
      } catch (error) {
        // Silently handle - settings endpoint is optional
        // Using default settings if backend isn't configured
        console.log('Settings endpoint not available, using defaults');
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
        bookingLimits: {
          maxBookingsPerBarber: settings.bookingsPerBarber,
        },
        loyaltySettings: {
          pointsPerVisit: settings.loyaltyPointsPerVisit,
          pointsPerDollar: settings.pointsPerDollar,
        },
        bookingPolicies: {
          cancellationNoticeDays: settings.cancellationDays,
          downPaymentPercentage: settings.downPaymentPercentage,
        },
        notifications: {
          emailEnabled: settings.emailNotifications,
          smsEnabled: settings.smsNotifications,
          reminderHours: settings.reminderHours,
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
          <div className="space-y-2">
            <Label htmlFor="bookingsPerBarber">
              Max Bookings Per Barber Per Day
            </Label>
            <Input
              id="bookingsPerBarber"
              type="number"
              value={settings.bookingsPerBarber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bookingsPerBarber: parseInt(e.target.value),
                })
              }
            />
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

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <div>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure customer notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-slate-500">
                Send booking confirmations via email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  emailNotifications: checked,
                })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>SMS Notifications</Label>
              <p className="text-sm text-slate-500">
                Send reminders via SMS
              </p>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  smsNotifications: checked,
                })
              }
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="reminderHours">
              Reminder Time (Hours Before)
            </Label>
            <Input
              id="reminderHours"
              type="number"
              value={settings.reminderHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reminderHours: parseInt(e.target.value),
                })
              }
            />
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