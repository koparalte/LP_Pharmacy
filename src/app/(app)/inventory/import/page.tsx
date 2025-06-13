
"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";

interface CSVRecord {
  id: string;
  newStock: number;
}

export default function ImportInventoryPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      if (event.target.files[0].type === "text/csv") {
        setFile(event.target.files[0]);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV file.",
          variant: "destructive",
        });
        event.target.value = ""; // Reset file input
        setFile(null);
      }
    } else {
      setFile(null);
    }
  };

  const parseCSV = (csvText: string): CSVRecord[] => {
    const records: CSVRecord[] = [];
    const lines = csvText.trim().split(/\r\n|\n/); // Handles both Windows and Unix line endings

    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row.");
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim());
    
    const idIndex = headers.indexOf('id');
    const newStockIndex = headers.indexOf('newstock');

    if (idIndex === -1 || newStockIndex === -1) {
      throw new Error("CSV header must contain 'id' and 'newStock' columns (case-insensitive). Example: id,newStock");
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue; // Skip empty lines

      const values = line.split(',');
      const id = values[idIndex]?.trim();
      const newStockStr = values[newStockIndex]?.trim();
      const newStock = parseInt(newStockStr, 10);

      if (id && id.length > 0 && !isNaN(newStock) && newStock >= 0) {
        records.push({ id, newStock });
      } else {
        console.warn(`Skipping invalid data row: "${line}". Ensure ID is present and newStock is a non-negative number.`);
        // Optionally, collect these warnings to show to the user later
      }
    }
    return records;
  };

  const handleImport = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select a CSV file to import.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      let parsedRecords: CSVRecord[];
      try {
        parsedRecords = parseCSV(csvText);
        if (parsedRecords.length === 0) {
          toast({ title: "No Valid Data", description: "The CSV file does not contain any valid data rows or is improperly formatted.", variant: "destructive" });
          setIsProcessing(false);
          return;
        }
      } catch (error: any) {
        toast({ title: "CSV Parsing Error", description: error.message, variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      const batchLimit = 500; // Firestore batch limit
      let totalProcessed = 0;
      let totalFailed = 0;
      let successfulUpdates = 0;

      for (let i = 0; i < parsedRecords.length; i += batchLimit) {
        const batch = writeBatch(db);
        const chunk = parsedRecords.slice(i, i + batchLimit);

        chunk.forEach(record => {
          const itemDocRef = doc(db, "inventory", record.id);
          batch.update(itemDocRef, {
            stock: record.newStock,
            lastUpdated: new Date().toISOString(),
          });
        });

        try {
          await batch.commit();
          successfulUpdates += chunk.length;
        } catch (batchError: any) {
          console.error("Error committing batch: ", batchError);
          // For simplicity, count all in a failed batch as failed.
          // More granular error handling could check individual document update failures if Firestore provided that.
          totalFailed += chunk.length; 
          toast({
            title: "Batch Update Error",
            description: `A batch of ${chunk.length} items failed to update. Check console for details. Error: ${batchError.message}`,
            variant: "destructive",
          });
        }
        totalProcessed += chunk.length;
      }
      
      setIsProcessing(false);
      setFile(null); // Reset file input
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";


      if (successfulUpdates > 0) {
         toast({
          title: "Import Successful",
          description: `${successfulUpdates} item(s) stock updated successfully. ${totalFailed > 0 ? `${totalFailed} item(s) failed.` : ''}`,
        });
      } else if (totalFailed > 0 && successfulUpdates === 0) {
         toast({
          title: "Import Failed",
          description: `All ${totalFailed} item(s) in the CSV failed to update.`,
          variant: "destructive",
        });
      } else if (parsedRecords.length > 0 && successfulUpdates === 0 && totalFailed === 0) {
        // This case might happen if all rows were skipped by the parser due to bad data
        toast({
          title: "Import Partially Completed",
          description: "Some rows in the CSV may have been invalid and were skipped. No items were updated.",
          variant: "destructive",
        });
      }


      // Optionally, navigate back or prompt for another import
      // router.push("/inventory"); // This will trigger a refetch on the inventory page
    };

    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Could not read the selected file.", variant: "destructive" });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2">
         <Button variant="outline" size="icon" onClick={() => router.back()} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
         </Button>
        <h1 className="text-3xl font-bold font-headline">Import Inventory Stock</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>
            Upload a CSV file to update stock quantities for your inventory items.
            The CSV file must contain a header row with `id` and `newStock` columns (case-insensitive).
            The `id` is the item's Firestore document ID, and `newStock` is the new total stock quantity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv-file-input">CSV File</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              disabled={isProcessing}
            />
             <p className="mt-2 text-xs text-muted-foreground">
              Example CSV format:
              <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
                id,newStock<br/>
                yourFirestoreItemId1,100<br/>
                yourFirestoreItemId2,75
              </pre>
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleImport} disabled={!file || isProcessing} className="w-full sm:w-auto">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Import Stock
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
