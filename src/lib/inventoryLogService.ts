
'use server';

import { db } from "@/lib/firebase";
import { doc, runTransaction, arrayUnion, collection, getDocs, writeBatch } from "firebase/firestore";
import type { InventoryMovement, DailyMovementLog } from "@/lib/types";
import { format } from "date-fns";

// Utility to generate a unique ID for each movement event
function generateEventId(): string {
  return `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface LogMovementData extends Omit<InventoryMovement, 'eventId' | 'recordedAt' | 'movedByUserId' | 'movedByUserName'> {
  movedByUserId: string;
  movedByUserName?: string;
}

export async function logInventoryMovement(movementData: LogMovementData): Promise<void> {
  const todayStr = format(new Date(), "yyyy-MM-dd"); 
  const docIdDate = movementData.movementDate || todayStr;
  const dailyLogDocRef = doc(db, "dailyMovementLogs", docIdDate);
  const currentTimestamp = new Date().toISOString();

  const newMovementEvent: InventoryMovement = {
    ...movementData, // Spread existing data including itemId, itemName, type, quantity, source, reason
    eventId: generateEventId(),
    recordedAt: currentTimestamp,
    movementDate: movementData.movementDate || todayStr,
    movedByUserId: movementData.movedByUserId,
    movedByUserName: movementData.movedByUserName || "Unknown User", // Default if not provided
  };

  try {
    await runTransaction(db, async (transaction) => {
      const dailyLogDoc = await transaction.get(dailyLogDocRef);

      if (!dailyLogDoc.exists()) {
        const newDailyLog: DailyMovementLog = {
          id: docIdDate,
          date: docIdDate,
          movements: [newMovementEvent],
          lastUpdated: currentTimestamp,
        };
        transaction.set(dailyLogDocRef, newDailyLog);
      } else {
        transaction.update(dailyLogDocRef, {
          movements: arrayUnion(newMovementEvent),
          lastUpdated: currentTimestamp,
        });
      }
    });
  } catch (error: any) {
    const originalErrorMessage = error.message || "Unknown error during Firestore transaction";
    console.error("Error logging inventory movement: Original error ->", error);
    throw new Error(`Failed to log inventory movement: ${originalErrorMessage}`);
  }
}

export async function clearAllDailyMovementLogs(): Promise<{ success: boolean; message: string }> {
  const dailyLogsCollectionRef = collection(db, "dailyMovementLogs");
  try {
    const querySnapshot = await getDocs(dailyLogsCollectionRef);
    if (querySnapshot.empty) {
      return { success: true, message: "No logs found to delete." };
    }

    const batchSize = 400; 
    let batch = writeBatch(db);
    let count = 0;

    for (const docSnapshot of querySnapshot.docs) {
      batch.delete(docSnapshot.ref);
      count++;
      if (count === batchSize) {
        await batch.commit();
        batch = writeBatch(db); 
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, message: "All inventory movement logs have been successfully deleted." };
  } catch (error: any) {
    console.error("Error clearing all daily movement logs: ", error);
    return { success: false, message: `Failed to clear logs: ${error.message || "Unknown error"}` };
  }
}
