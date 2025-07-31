


"use server"

import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from "../validators/sessionData";
import validateUser from "../validators/validateUser";

const prisma = new PrismaClient();

export async function fetchAllSlots() {
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

        // Fetch all existing slots
        const slots = await prisma.slot.findMany({
            where: {
                is_active: true,
                is_deleted: false,
            },
            include: {
                game: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        image_url: true,
                    },
                },
            },
            orderBy: {
                start_time: 'asc',
            },
        });

        const data =  {
            status: true,
            message: "All slots fetched successfully",
            data: slots.map(slot => ({
                id: slot.id,
                game_id: slot.game_id,
                start_time: slot.start_time.toISOString(),
                end_time: slot.end_time.toISOString(),
                price: slot.price.toString(),
                name: slot.name,
                description: slot.description,
                status: slot.status,
                created_at: slot.created_at.toISOString(),
                updated_at: slot.updated_at.toISOString(),
                game: {
                    id: slot.game.id,
                    name: slot.game.name,
                    description: slot.game.description,
                    image_url: slot.game.image_url,
                },
            })),
        };

        return JSON.parse(JSON.stringify(data));

    } catch (error) {
        console.error("Error fetching slots:", error);
        return {
            status: false,
            message: "Failed to fetch slots",
            data: null,
        };
    } finally {
        await prisma.$disconnect();
    }
}