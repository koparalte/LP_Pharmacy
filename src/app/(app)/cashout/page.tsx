
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export default function CashoutPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Cashout</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Cashout Operations</CardTitle>
          <CardDescription>Manage your cashout transactions and view history.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4">
            <Image 
              src="https://placehold.co/400x300.png" 
              alt="Cashout illustration" 
              width={400} 
              height={300} 
              className="rounded-md object-cover"
              data-ai-hint="finance payment"
            />
            <p className="text-muted-foreground">
              This is where cashout functionalities will be implemented. 
              You'll be able to initiate cashouts, view transaction statuses, and manage payment methods.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
