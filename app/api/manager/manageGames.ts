"use server"
import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from '../validators/sessionData';
import validateManager from "../validators/validateManager";
const prisma = new PrismaClient();

// Define GameType enum to match Prisma schema
enum GameType {
  TURF_CRICKET = 'TURF_CRICKET',
  PICKLE_BALL_COURT_1 = 'PICKLE_BALL_COURT_1',
  PICKLE_BALL_COURT_2 = 'PICKLE_BALL_COURT_2',
  CRICKET_GROUND = 'CRICKET_GROUND',
  BADMINTON_OUTDOOR = 'BADMINTON_OUTDOOR',
  KIDS_PLAY_AREA = 'KIDS_PLAY_AREA',
}

// Interface for game creation input
interface GameData {
  name: GameType;
  description?: string;
  image_url?: string;
  slot_duration: number;
}



// 1. Function to create a game
export async function createGame(gameData: GameData) {
  try {
    // Check if user session is active
    const session = await IsSessionActive();
    if (!session) {
      throw new Error('User session is not active');
    }

    if (!session.data || !session.data.id) {
      throw new Error('Session data or user ID is missing');
    }
    const userId = session.data.id; // Assuming session data contains user ID

    // Validate user role if needed
    const roleValidation = await validateManager();
    if (!roleValidation.status) {
      throw new Error(roleValidation.message);
    }
    if (!gameData.name || !gameData.slot_duration) {
      throw new Error('Game name and slot duration are required');
    }
    
    const { name, description, image_url, slot_duration } = gameData;

    // Validate game name against GameType enum
    if (!name || !Object.values(GameType).includes(name)) {
      throw new Error(`Invalid game name. Must be one of: ${Object.values(GameType).join(', ')}`);
    }

    // Validate slot duration
    if (!slot_duration || typeof slot_duration !== 'number' || slot_duration <= 0) {
      throw new Error('Invalid slot duration. Must be a positive number');
    }

    // Create game in database
    const game = await prisma.game.create({
      data: {
        name,
        description: description || null,
        image_url: image_url || null,
        slot_duration,
        created_by: userId,
        updated_by: userId,
        is_active: true,
        is_deleted: false,
      },
    });

    return { success: true, game };
  } catch (error: any) {
    console.error('Error creating game:', error);
    return { success: false, error: error.message };
  }
}
