"use server";
import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export default async function authenticateOrCreateUser(
  email: string,
  fullName: string,
  imageUrl?: string
) {
  try {
    if (!email || !fullName || !imageUrl) {
      return {
        status: 400,
        message: "Missing required fields.",
      };
    }

    // Get current timestamp
    const currentTimestamp = new Date();

    // Check if the user already exists
    let user = await prisma.user.findUnique({
      where: { email: email },
    });

    // If user does not exist, create a new user with last_login
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email,
          full_name: fullName,
          image_url: imageUrl || null,
          role: "USER",
          last_login: currentTimestamp,
        },
      });
    } else {
      // Update existing user's last_login
      user = await prisma.user.update({
        where: { email: email },
        data: {
          last_login: currentTimestamp,
        },
      });
    }

    return {
      status: 200,
      data: user,
    };
  } catch (error) {
    console.error("Error in authenticateOrCreateUser:", error);
    return {
      status: 500,
      message: "An error occurred while authenticating or creating the user.",
    };
  }
}