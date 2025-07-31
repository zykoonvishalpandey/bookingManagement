"use server";

import { auth } from "@/auth";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export default async function validateAdmin() {
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
      where: { email: session.user.email },
      select: { role: true }, // Select only the role field
    });

    if (!user) {
      return {
        status: false,
        message: "User not found",
        data: null,
      };
    }

    if (user.role !== "ADMIN") {
      return {
        status: false,
        message: `User role does not match. Expected: ADMIN, Found: ${user.role}`,
        data: null,
      };
    }

    return {
      status: true,
      message: "User role validated successfully",
      data: { role: user.role },
    };
  } catch (error) {
    console.error("Error validating user role:", error);
    return {
      status: false,
      message: "Internal server error",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}