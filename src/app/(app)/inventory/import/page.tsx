
"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { ArrowLeft, FileUp, Loader2 } from "lucide-react";
import type { InventoryItem } from "@/lib/types";

type NewInventoryItemCSVRecord = Omit<InventoryItem, 'id' | 'lastUpdated'>;

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
        event.target.value = ""; 
        setFile(null);
      }
    } else {
      setFile(null);
    }
  };

  const parseCSV = (csvText: string): { newItems: NewInventoryItemCSVRecord[], skippedRows: number } => {
    const newItems: NewInventoryItemCSVRecord[] = [];
    let skippedRows = 0;
    const lines = csvText.trim().split(/\r\n|\n/);

    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row.");
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const expectedHeaders = {
      name: "name",
      batchNo: "batchno",
      unit: "unit",
      stock: "stock",
      lowStockThreshold: "lowstockthreshold",
      costPrice: "costprice",
      rate: "rate",
      mrp: "mrp",
      expiryDate: "expirydate", 
    };

    const headerIndices: { [key: string]: number } = {};
    for (const key in expectedHeaders) {
      const index = headers.indexOf(expectedHeaders[key as keyof typeof expectedHeaders]);
      headerIndices[key] = index;
    }

    const requiredFields: (keyof typeof expectedHeaders)[] = ["name", "stock", "lowStockThreshold", "costPrice", "rate", "mrp"];
    for (const field of requiredFields) {
      if (headerIndices[field] === -1) {
        throw new Error(`CSV header must contain '${expectedHeaders[field]}' column (case-insensitive).`);
      }
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === "") continue;

      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      let validRow = true;
      const itemData: any = {}; 

      const name = values[headerIndices.name];
      if (!name) { validRow = false; console.warn(`Skipping row ${i+1}: Name is required.`); }
      itemData.name = name;
      
      itemData.batchNo = headerIndices.batchNo !== -1 ? values[headerIndices.batchNo] || undefined : undefined;
      itemData.unit = headerIndices.unit !== -1 ? values[headerIndices.unit] || undefined : undefined;

      const stockStr = values[headerIndices.stock];
      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) { validRow = false; console.warn(`Skipping row ${i+1}: Stock must be a non-negative number. Found: '${stockStr}' for item '${name}'`);}
      itemData.stock = stock;

      const lowStockThresholdStr = values[headerIndices.lowStockThreshold];
      const lowStockThreshold = parseInt(lowStockThresholdStr, 10);
      if (isNaN(lowStockThreshold) || lowStockThreshold < 0) { validRow = false; console.warn(`Skipping row ${i+1}: Low Stock Threshold must be a non-negative number. Found: '${lowStockThresholdStr}' for item '${name}'`);}
      itemData.lowStockThreshold = lowStockThreshold;
      
      const costPriceStr = values[headerIndices.costPrice];
      const costPrice = parseFloat(costPriceStr);
      if (isNaN(costPrice) || costPrice <= 0) { validRow = false; console.warn(`Skipping row ${i+1}: Cost Price must be a positive number. Found: '${costPriceStr}' for item '${name}'`);}
      itemData.costPrice = costPrice;

      const rateStr = values[headerIndices.rate];
      const rate = parseFloat(rateStr);
      if (isNaN(rate) || rate <= 0) { validRow = false; console.warn(`Skipping row ${i+1}: Rate must be a positive number. Found: '${rateStr}' for item '${name}'`);}
      itemData.rate = rate;

      const mrpStr = values[headerIndices.mrp];
      const mrp = parseFloat(mrpStr);
      if (isNaN(mrp) || mrp <= 0) { validRow = false; console.warn(`Skipping row ${i+1}: MRP must be a positive number. Found: '${mrpStr}' for item '${name}'`);}
      itemData.mrp = mrp;

      if (headerIndices.expiryDate !== -1) {
        const expiryDateStr = values[headerIndices.expiryDate];
        if (expiryDateStr) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(expiryDateStr)) {
            itemData.expiryDate = expiryDateStr;
          } else {
            console.warn(`Skipping expiry date for row ${i+1} (item '${name}'): Invalid format. Expected YYYY-MM-DD. Found: '${expiryDateStr}'`);
            itemData.expiryDate = undefined;
          }
        } else {
            itemData.expiryDate = undefined;
        }
      } else {
        itemData.expiryDate = undefined;
      }

      if (validRow && itemData.mrp < itemData.rate) {
        console.warn(`Skipping row ${i+1} (item '${name}'): MRP (${itemData.mrp}) cannot be less than Rate (${itemData.rate}).`);
        validRow = false;
      }
      if (validRow && itemData.rate < itemData.costPrice) {
         console.warn(`Skipping row ${i+1} (item '${name}'): Rate (${itemData.rate}) cannot be less than Cost Price (${itemData.costPrice}).`);
         validRow = false;
      }
      
      if (validRow) {
        newItems.push(itemData as NewInventoryItemCSVRecord);
      } else {
        skippedRows++;
      }
    }
    return { newItems, skippedRows };
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
      let parseResult: { newItems: NewInventoryItemCSVRecord[], skippedRows: number };
      try {
        parseResult = parseCSV(csvText);
        if (parseResult.newItems.length === 0 && parseResult.skippedRows > 0) {
           toast({ title: "No Valid Data", description: `All ${parseResult.skippedRows} data rows were invalid or skipped. Please check CSV format and data. See console for details.`, variant: "destructive" });
           setIsProcessing(false);
           return;
        }
        if (parseResult.newItems.length === 0) {
          toast({ title: "No Data to Import", description: "The CSV file does not contain any valid items to add.", variant: "destructive" });
          setIsProcessing(false);
          return;
        }
      } catch (error: any) {
        toast({ title: "CSV Parsing Error", description: error.message, variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      const batchLimit = 500; 
      let itemsAddedSuccessfully = 0;
      const inventoryCollectionRef = collection(db, "inventory");

      for (let i = 0; i < parseResult.newItems.length; i += batchLimit) {
        const batch = writeBatch(db);
        const chunk = parseResult.newItems.slice(i, i + batchLimit);

        chunk.forEach(newItemPayload => {
          const newDocRef = doc(inventoryCollectionRef); 
          batch.set(newDocRef, {
            ...newItemPayload,
            lastUpdated: new Date().toISOString(),
          });
        });

        try {
          await batch.commit();
          itemsAddedSuccessfully += chunk.length;
        } catch (batchError: any) {
          console.error("Error committing batch: ", batchError);
          toast({
            title: "Batch Add Error",
            description: `A batch of ${chunk.length} items failed to be added. Check console for details. Error: ${batchError.message}`,
            variant: "destructive",
          });
        }
      }
      
      setIsProcessing(false);
      setFile(null); 
      const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      let feedbackMessage = "";
      if (itemsAddedSuccessfully > 0) {
        feedbackMessage += `${itemsAddedSuccessfully} new item(s) added successfully. `;
      }
      if (parseResult.skippedRows > 0) {
        feedbackMessage += `${parseResult.skippedRows} row(s) were skipped due to invalid data (check console for details).`;
      }

      if (itemsAddedSuccessfully === 0 && parseResult.skippedRows > 0) {
         toast({
          title: "Import Complete with Issues",
          description: feedbackMessage || "No items were added. Check CSV file for errors.",
          variant: "destructive"
        });
      } else if (itemsAddedSuccessfully > 0) {
         toast({
          title: "Import Successful",
          description: feedbackMessage || "Items processed.",
        });
      } else if (parseResult.newItems.length > 0 && itemsAddedSuccessfully === 0 && parseResult.skippedRows === 0) {
         toast({
          title: "Import Failed",
          description: "No items were added. An unexpected error occurred.",
          variant: "destructive",
        });
      }
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
        <h1 className="text-3xl font-bold font-headline">Import New Inventory Items</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File to Add New Items</CardTitle>
          <CardDescription>
            Upload a CSV file to add new items to your inventory. Firestore will auto-generate IDs.
            The CSV file must contain a header row with the following columns (case-insensitive, quotes in headers/values will be removed):
            <ul className="list-disc list-inside mt-2 text-xs">
              <li><code className="font-semibold">name</code> (Required, Text)</li>
              <li><code className="font-semibold">batchNo</code> (Optional, Text)</li>
              <li><code className="font-semibold">unit</code> (Optional, Text - e.g., strips, bottle)</li>
              <li><code className="font-semibold">stock</code> (Required, Number - initial stock quantity)</li>
              <li><code className="font-semibold">lowStockThreshold</code> (Required, Number)</li>
              <li><code className="font-semibold">costPrice</code> (Required, Number - purchase price)</li>
              <li><code className="font-semibold">rate</code> (Required, Number - selling price)</li>
              <li><code className="font-semibold">mrp</code> (Required, Number - Maximum Retail Price)</li>
              <li><code className="font-semibold">expiryDate</code> (Optional, Text - format YYYY-MM-DD)</li>
            </ul>
             <p className="mt-1 text-xs text-destructive">Note: Rows where MRP is less than Rate, or Rate is less than Cost Price will be skipped.</p>
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
              Example CSV format (ensure headers are exactly as listed above, case-insensitive):
            </p>
            <pre className="mt-1 p-2 bg-muted rounded-md text-xs overflow-x-auto">
name,batchNo,unit,stock,lowStockThreshold,costPrice,rate,mrp,expiryDate<br/>
Amoxicillin 250mg,BATCH001,strips,100,20,40.00,50.00,55.00,2025-12-31<br/>
Paracetamol 500mg,,pcs,200,50,20.00,25.50,30.00,
            </pre>
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
                Import New Items
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
