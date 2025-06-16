
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth"; // To potentially show admin email or other details

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Admin Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Manage application-wide settings. Only accessible by administrators.
            {user?.email && <span className="block mt-1 text-xs text-muted-foreground">Logged in as: {user.email}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Future administrative settings will be available here. For example:
          </p>
          <ul className="list-disc list-inside mt-2 text-muted-foreground text-sm">
            <li>User role management</li>
            <li>Application theme customization</li>
            <li>Data export/import configurations</li>
            <li>Integration settings</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
