"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export default async function IsSessionActive() {
  try {
    const session = await auth();
    // console.log("Session data on server side:", session);

    if (!session?.user?.email) {
      return {
        status: false,
        message: "No session found on server side",
        data: null,
      };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email , is_active: true , is_deleted: false},
    });

    if (!user) {
      return {
        status: 404,
        message: "User not found",
        data: null,
      };
    }

    return {
      status: true,
      message: "User found",
      data: user,
    };
  } catch (error) {
    console.error("Error checking session:", error);
    return {
      status: false,
      message: "Internal server error",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}