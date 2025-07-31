"use server"

import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from "../validators/sessionData";
import validateUser from "../validators/validateUser";

const prisma = new PrismaClient();

export default async function getFeaturedGames() {
  try {
    // Validate session
    const sessionInfo = await IsSessionActive();
    if (!sessionInfo.status || !sessionInfo.data?.id) {
      return {
        status: false,
        message: sessionInfo.message || "Invalid session",
        data: null,
      };
    }

    // Validate user role
    const userRoleValidation = await validateUser();
    if (!userRoleValidation.status) {
      return {
        status: false,
        message: userRoleValidation.message || "User role validation failed",
        data: null,
      };
    }

    // Fetch featured games for the user
    const featuredGames = await prisma.game.findMany({
        where: {
            is_active: true,
        }
    });

    return {
      status: true,
      message: "Featured games fetched successfully",
      data: featuredGames,
    };

  } catch (error) {
    console.error("Error fetching featured games:", error);
    return {
      status: false,
      message: "Failed to fetch featured games",
      data: null,
    };
  }
}