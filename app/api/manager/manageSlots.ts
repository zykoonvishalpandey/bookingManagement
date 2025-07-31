// "use server"
// import { PrismaClient } from "@/generated/prisma";
// import schedule from 'node-schedule';
// import { addDays, startOfDay, setHours, setMinutes, setSeconds, addMinutes } from 'date-fns';
// import { toZonedTime } from 'date-fns-tz';

// const prisma = new PrismaClient();
// const TIMEZONE = 'Asia/Kolkata';

// // Interface for response types
// interface OperationResult<T> {
//   success: boolean;
//   game?: T;
//   message?: string;
//   error?: string;
// }

// // Define GameType enum to match Prisma schema
// enum GameType {
//   TURF_CRICKET = 'TURF_CRICKET',
//   PICKLE_BALL_COURT_1 = 'PICKLE_BALL_COURT_1',
//   PICKLE_BALL_COURT_2 = 'PICKLE_BALL_COURT_2',
//   CRICKET_GROUND = 'CRICKET_GROUND',
//   BADMINTON_OUTDOOR = 'BADMINTON_OUTDOOR',
//   KIDS_PLAY_AREA = 'KIDS_PLAY_AREA',
// }

// export async function createSlotsForNextSevenDays(): Promise<OperationResult<never>> {
//   try {
//     // Get all active games
//     const games = await prisma.game.findMany({
//       where: {
//         is_active: true,
//         is_deleted: false,
//       },
//     });

//     // Get current date in IST
//     const now = toZonedTime(new Date(), TIMEZONE);

//     // Loop through each of the next 7 days starting from today
//     for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
//       const targetDay = startOfDay(addDays(now, dayOffset));

//       for (const game of games) {
//         // Validate game name is still in enum
//         if (!Object.values(GameType).includes(game.name)) {
//           console.warn(`Skipping invalid game type: ${game.name}`);
//           continue;
//         }

//         // Calculate slots for the day, starting from 1 AM
//         let currentTime = setHours(setMinutes(setSeconds(targetDay, 0), 0), 1); // Start at 1 AM
//         const endOfDay = setHours(setMinutes(setSeconds(targetDay, 0), 0), 24); // Midnight (24:00)

//         while (currentTime < endOfDay) {
//           const slotStart = currentTime;
//           const slotEnd = addMinutes(currentTime, game.slot_duration);

//           // Ensure slot doesn't exceed end of day
//           if (slotEnd > endOfDay) break;

//           // Create slot
//           await prisma.slot.create({
//             data: {
//               game_id: game.id,
//               date: targetDay,
//               start_time: new Date(slotStart.getTime() - (slotStart.getTimezoneOffset() * 60000)),
//               end_time: new Date(slotEnd.getTime() - (slotEnd.getTimezoneOffset() * 60000)),
//               price: 500.00,
//               name: game.name,
//               description: 'Default description',
//               created_by: 2,
//               updated_by: 2,
//               is_active: true,
//               is_deleted: false,
//             },
//           });

//           // Move to next slot
//           currentTime = slotEnd;
//         }
//       }
//     }

//     return { success: true, message: 'Slots created successfully for the next 7 days' };
//   } catch (error: any) {
//     console.error('Error creating slots:', error);
//     return { success: false, error: error.message };
//   }
// }

// // Schedule slot creation to run every day at 12 AM IST
// schedule.scheduleJob('0 0 * * *', async () => {
//   console.log('Running slot creation job at', new Date().toLocaleString('en-IN', { timeZone: TIMEZONE }));
//   await createSlotsForNextSevenDays();
// });







"use server"
import { PrismaClient } from "@/generated/prisma";
import validateManager from "../validators/validateManager";

const prisma = new PrismaClient();

interface CreateSlotsParams {
  gameId: number;
  userId?: number; // Optional user ID for created_by and updated_by
}

/**
 * Recreates slots for a game - deletes existing slots and creates new ones
 * for 7 days (Monday to Sunday) with 24-hour coverage based on game duration
 */
export async function recreateGameSlots({ 
  gameId, 
  userId = 1 
}: CreateSlotsParams): Promise<{ success: boolean; message: string; slotsCreated: number }> {
  try {
    // Get game details
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { 
        id: true, 
        name: true, 
        slot_duration: true,
        is_active: true,
        is_deleted: true
      }
    });

    if (!game) {
      return {
        success: false,
        message: `Game with ID ${gameId} not found`,
        slotsCreated: 0
      };
    }

    if (!game.is_active || game.is_deleted) {
      return {
        success: false,
        message: `Game with ID ${gameId} is not active or has been deleted`,
        slotsCreated: 0
      };
    }

    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing slots for this game
      await tx.slot.deleteMany({
        where: { game_id: gameId }
      });

      // Create slots for 7 days
      const slots = generateWeeklySlots(gameId, game.slot_duration, userId);
      
      // Insert new slots in batches for better performance
      const batchSize = 100;
      for (let i = 0; i < slots.length; i += batchSize) {
        const batch = slots.slice(i, i + batchSize);
        await tx.slot.createMany({
          data: batch
        });
      }
    });

    const slotsCreated = Math.ceil((24 * 60) / game.slot_duration) * 7;
    console.log(`Successfully recreated slots for game: ${game.name} (ID: ${gameId})`);
    console.log(`Created ${slotsCreated} slots`);

    return {
      success: true,
      message: `Successfully recreated ${slotsCreated} slots for game: ${game.name}`,
      slotsCreated
    };

  } catch (error) {
    console.error('Error recreating game slots:', error);
    return {
      success: false,
      message: `Error recreating slots: ${error instanceof Error ? error.message : 'Unknown error'}`,
      slotsCreated: 0
    };
  }
}

/**
 * Generates slot data for a week (Monday to Sunday)
 */
function generateWeeklySlots(
  gameId: number, 
  slotDuration: number, 
  userId: number
): Array<{
  game_id: number;
  start_time: Date;
  end_time: Date;
  name: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_by: number;
  updated_by: number;
  is_active: boolean;
  is_deleted: boolean;
}> {
  const slots = [];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Get current Monday as starting point
  const startOfWeek = getStartOfWeek();
  
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const currentDay = new Date(startOfWeek);
    currentDay.setDate(startOfWeek.getDate() + dayIndex);
    
    // Create slots for 24 hours (00:00 to 23:59)
    const slotsPerDay = Math.ceil((24 * 60) / slotDuration);
    
    for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex++) {
      const startMinutes = slotIndex * slotDuration;
      const endMinutes = Math.min(startMinutes + slotDuration, 24 * 60);
      
      const startTime = new Date(currentDay);
      startTime.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      
      const endTime = new Date(currentDay);
      endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
      
      // If end time goes to next day, set it to end of current day
      if (endMinutes >= 24 * 60) {
        endTime.setHours(23, 59, 59, 999);
      }
      
      const slotName = `${dayNames[dayIndex]} ${formatTime(startTime)} - ${formatTime(endTime)}`;
      
      slots.push({
        game_id: gameId,
        start_time: startTime,
        end_time: endTime,
        name: slotName,
        price: 0.00,
        status: 'ACTIVE' as const,
        created_by: userId,
        updated_by: userId,
        is_active: true,
        is_deleted: false
      });
    }
  }
  
  return slots;
}

/**
 * Gets the start of current week (Monday)
 */
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday (0) and get Monday
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  return monday;
}

/**
 * Formats time to HH:MM format
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Recreate slots for multiple games
 */
export async function recreateMultipleGameSlots(
  gameIds: number[], 
  userId: number = 1
): Promise<{ success: boolean; message: string; results: Array<{ gameId: number; success: boolean; message: string; slotsCreated: number }> }> {
  const results = [];
  let totalSlotsCreated = 0;
  let successCount = 0;

  for (const gameId of gameIds) {
    const result = await recreateGameSlots({ gameId, userId });
    results.push({ gameId, ...result });
    
    if (result.success) {
      successCount++;
      totalSlotsCreated += result.slotsCreated;
    }
  }

  return {
    success: successCount === gameIds.length,
    message: `Processed ${gameIds.length} games. Success: ${successCount}, Failed: ${gameIds.length - successCount}. Total slots created: ${totalSlotsCreated}`,
    results
  };
}

/**
 * Recreate slots for all active games
 */
export async function recreateAllActiveGameSlots(userId?: number): Promise<void> {
  const defaultUserId = userId || 1;
  try {
    const activeGames = await prisma.game.findMany({
      where: {
        is_active: true,
        is_deleted: false
      },
      select: { id: true, name: true }
    });

    console.log(`Found ${activeGames.length} active games`);

    for (const game of activeGames) {
      await recreateGameSlots({ gameId: game.id, userId: defaultUserId });
    }

    console.log('Successfully recreated slots for all active games');
  } catch (error) {
    console.error('Error recreating slots for all games:', error);
    throw error;
  }
}

// Usage examples:
/*
// Recreate slots for a specific game
const result = await recreateGameSlots({ gameId: 1, userId: 123 });
console.log(result); 
// { success: true, message: "Successfully recreated 168 slots for game: Chess", slotsCreated: 168 }

// Recreate slots for multiple games
const multiResult = await recreateMultipleGameSlots([1, 2, 3], 123);
console.log(multiResult);
// { success: true, message: "Processed 3 games. Success: 3, Failed: 0. Total slots created: 504", results: [...] }

// Recreate slots for all active games
const allResult = await recreateAllActiveGameSlots(123);
console.log(allResult);
// { success: true, message: "Successfully recreated slots for all 5 active games. Total slots created: 840", totalGames: 5, successfulGames: 5, totalSlotsCreated: 840, results: [...] }
*/