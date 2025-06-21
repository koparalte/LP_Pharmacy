
'use server';

import { db } from "@/lib/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";

export async function batchDeleteBills(billIds: string[]): Promise<{ success: boolean; message: string, deletedCount: number }> {
  if (!billIds || billIds.length === 0) {
    return { success: false, message: "No bill IDs provided for deletion.", deletedCount: 0 };
  }

  const billsCollectionRef = collection(db, "finalizedBills");
  const batchLimit = 500;
  let deletedCount = 0;

  try {
    for (let i = 0; i < billIds.length; i += batchLimit) {
      const batch = writeBatch(db);
      const chunk = billIds.slice(i, i + batchLimit);
      
      chunk.forEach(id => {
        const docRef = doc(billsCollectionRef, id);
        batch.delete(docRef);
      });

      await batch.commit();
      deletedCount += chunk.length;
    }
    return { success: true, message: `${deletedCount} bill(s) deleted successfully.`, deletedCount };
  } catch (error: any) {
    console.error("Error batch deleting bills: ", error);
    return { success: false, message: `Failed to delete bills: ${error.message || "Unknown error"}`, deletedCount };
  }
}
