"use server";
import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from "../validators/sessionData";
import { toZonedTime } from "date-fns-tz";
import validateUser from "../validators/validateUser";
const prisma = new PrismaClient();
const TIMEZONE = "Asia/Kolkata";

// Interface for response types
interface OperationResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export async function createNewBooking(
  slotId: number, bookingDate: Date
): Promise<OperationResult<any>> {
  try {
    // Validate user session
    const userInfo = await IsSessionActive();
    if (!userInfo || !userInfo.status) {
      return {
        success: false,
        message: "User session is not active",
        data: null,
      };
    }

    // Validate user role
    const isValidRole = await validateUser();
    if (!isValidRole) {
      return {
        success: false,
        message: "User does not have permission to create a booking",
        data: null,
      };
    }

    // Ensure user data is available
    if (!userInfo.data || !userInfo.data.id) {
      return {
        success: false,
        message: "User data is not available",
        data: null,
      };
    }
    const userId = userInfo.data.id;

    // Validate slot exists and is active
    const slot = await prisma.slot.findFirst({
      where: {
        id: slotId,
        is_active: true,
        is_deleted: false,
        status: "ACTIVE", // Ensure slot status is ACTIVE
      },
    });

    if (!slot) {
      return {
        success: false,
        message: "Slot not found or is not active",
        data: null,
      };
    }

    // Get current timestamp in IST
    // const bookingDate = toZonedTime(new Date(), TIMEZONE);

    // Create booking and get complete data
    const result = await prisma.$transaction(async (tx) => {
      // Create booking
      const booking = await tx.booking.create({
        data: {
          user_id: userId,
          slot_id: slotId,
          status: "PENDING", // Default per schema
          booking_date: bookingDate,
          amount: slot.price,
          created_by: userId,
          updated_by: userId,
          is_active: true,
          is_deleted: false,
        },
      });

      // Update slot status
      await tx.slot.update({
        where: { id: slotId },
        data: { status: "INACTIVE" },
      });

      // Fetch complete booking data with all relations
      const completeBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        select: {
          id: true,
          status: true,
          booking_date: true,
          amount: true,
          created_at: true,
          updated_at: true,
          slot: {
            select: {
              id: true,
              game_id: true,
              start_time: true,
              end_time: true,
              price: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              game: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  image_url: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              reference_no: true,
              description: true,
              payment_type: true,
              payment_status: true,
              payment_mode: true,
              payment_desc_type: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });

      return completeBooking;
    });

    // Format the response to match dashboard data structure
    const formattedBooking = {
      id: result.id,
      status: result.status,
      booking_date: result.booking_date.toISOString(),
      amount: result.amount.toString(),
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
      slot: {
        id: result.slot.id,
        game_id: result.slot.game_id,
        date: result.slot.date.toISOString(),
        start_time: result.slot.start_time.toISOString(),
        end_time: result.slot.end_time.toISOString(),
        price: result.slot.price.toString(),
        name: result.slot.name,
        description: result.slot.description,
        created_at: result.slot.created_at.toISOString(),
        updated_at: result.slot.updated_at.toISOString(),
        game: {
          id: result.slot.game.id,
          name: result.slot.game.name,
          description: result.slot.game.description,
          image_url: result.slot.game.image_url,
        },
      },
      payments: result.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        reference_no: payment.reference_no,
        description: payment.description,
        payment_type: payment.payment_type,
        payment_status: payment.payment_status,
        payment_mode: payment.payment_mode,
        payment_desc_type: payment.payment_desc_type,
        created_at: payment.created_at.toISOString(),
        updated_at: payment.updated_at.toISOString(),
      })),
    };

    console.log("Booking created successfully:", formattedBooking);

    return {
      success: true,
      data: formattedBooking,
      message: "Booking created successfully",
    };
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      message: error.message || "Failed to create booking",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function rescheduleBooking(
  bookingId: number,
  newSlotId: number
): Promise<OperationResult<any>> {
  try {
    // Validate user session
    const userInfo = await IsSessionActive();
    if (!userInfo || !userInfo.status) {
      return {
        success: false,
        message: "User session is not active",
        data: null,
      };
    }

    // Validate user role
    const isValidRole = await validateUser();
    if (!isValidRole) {
      return {
        success: false,
        message: "User does not have permission to reschedule booking",
        data: null,
      };
    }

    // Ensure user data is available
    if (!userInfo.data || !userInfo.data.id) {
      return {
        success: false,
        message: "User data is not available",
        data: null,
      };
    }
    const userId = userInfo.data.id;

    // Find the existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        user_id: userId, // Ensure user owns this booking
        is_active: true,
        is_deleted: false,
        status: {
          in: ["PENDING", "CONFIRMED"], // Only allow rescheduling active bookings
        },
      },
      include: {
        slot: true,
      },
    });

    if (!existingBooking) {
      return {
        success: false,
        message: "Booking not found or cannot be rescheduled",
        data: null,
      };
    }

    // Validate new slot exists and is active
    const newSlot = await prisma.slot.findFirst({
      where: {
        id: newSlotId,
        is_active: true,
        is_deleted: false,
        status: "ACTIVE",
      },
    });

    if (!newSlot) {
      return {
        success: false,
        message: "New slot not found or is not active",
        data: null,
      };
    }

    // Check if new slot is already booked
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        slot_id: newSlotId,
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        is_active: true,
        is_deleted: false,
      },
    });

    if (conflictingBooking) {
      return {
        success: false,
        message: "The new slot is already booked",
        data: null,
      };
    }

    // Check if the new slot time has already passed
    const currentTime = toZonedTime(new Date(), TIMEZONE);
    const newSlotStartTime = toZonedTime(newSlot.start_time, TIMEZONE);
    if (newSlotStartTime <= currentTime) {
      return {
        success: false,
        message:
          "Cannot reschedule to a slot that has already started or passed",
        data: null,
      };
    }

    // Perform the reschedule in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the booking with new slot and amount
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          slot_id: newSlotId,
          amount: newSlot.price,
          updated_by: userId,
          updated_at: currentTime,
        },
      });

      // Make the old slot available again
      await tx.slot.update({
        where: { id: existingBooking.slot_id },
        data: { status: "ACTIVE" },
      });

      // Make the new slot unavailable
      await tx.slot.update({
        where: { id: newSlotId },
        data: { status: "INACTIVE" },
      });

      // Fetch complete updated booking data
      const updatedBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          booking_date: true,
          amount: true,
          created_at: true,
          updated_at: true,
          slot: {
            select: {
              id: true,
              game_id: true,
              date: true,
              start_time: true,
              end_time: true,
              price: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              game: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  image_url: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              reference_no: true,
              description: true,
              payment_type: true,
              payment_status: true,
              payment_mode: true,
              payment_desc_type: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      });

      return updatedBooking;
    });

    // Format the response to match dashboard data structure
    const formattedBooking = {
      id: result.id,
      status: result.status,
      booking_date: result.booking_date.toISOString(),
      amount: result.amount.toString(),
      created_at: result.created_at.toISOString(),
      updated_at: result.updated_at.toISOString(),
      slot: {
        id: result.slot.id,
        game_id: result.slot.game_id,
        start_time: result.slot.start_time.toISOString(),
        end_time: result.slot.end_time.toISOString(),
        price: result.slot.price.toString(),
        name: result.slot.name,
        description: result.slot.description,
        created_at: result.slot.created_at.toISOString(),
        updated_at: result.slot.updated_at.toISOString(),
        game: {
          id: result.slot.game.id,
          name: result.slot.game.name,
          description: result.slot.game.description,
          image_url: result.slot.game.image_url,
        },
      },
      payments: result.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        reference_no: payment.reference_no,
        description: payment.description,
        payment_type: payment.payment_type,
        payment_status: payment.payment_status,
        payment_mode: payment.payment_mode,
        payment_desc_type: payment.payment_desc_type,
        created_at: payment.created_at.toISOString(),
        updated_at: payment.updated_at.toISOString(),
      })),
    };

    console.log("Booking rescheduled successfully:", formattedBooking);

    return {
      success: true,
      data: formattedBooking,
      message: "Booking rescheduled successfully",
    };
  } catch (error: any) {
    console.error("Error rescheduling booking:", error);
    return {
      success: false,
      message: error.message || "Failed to reschedule booking",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function cancelBooking(
  bookingId: number
): Promise<OperationResult<any>> {
  try {
    // Validate user session
    const userInfo = await IsSessionActive();
    if (!userInfo || !userInfo.status) {
      return {
        success: false,
        message: "User session is not active",
        data: null,
      };
    }

    // Validate user role
    const isValidRole = await validateUser();
    if (!isValidRole) {
      return {
        success: false,
        message: "User does not have permission to cancel booking",
        data: null,
      };
    }

    // Ensure user data is available
    if (!userInfo.data || !userInfo.data.id) {
      return {
        success: false,
        message: "User data is not available",
        data: null,
      };
    }
    const userId = userInfo.data.id;

    // Find the existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        user_id: userId, // Ensure user owns this booking
        is_active: true,
        is_deleted: false,
        status: {
          in: ["PENDING", "CONFIRMED"], // Only allow cancelling active bookings
        },
      },
      include: {
        slot: true,
      },
    });

    if (!existingBooking) {
      return {
        success: false,
        message: "Booking not found or cannot be cancelled",
        data: null,
      };
    }

    // Perform the cancellation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update booking status to CANCELLED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          updated_by: userId,
          updated_at: toZonedTime(new Date(), TIMEZONE),
        },
      });

      // Make the slot available again
      await tx.slot.update({
        where: { id: existingBooking.slot_id },
        data: { status: "ACTIVE" },
      });

      return bookingId;
    });

    console.log("Booking cancelled successfully:", result);

    return {
      success: true,
      data: { id: result }, // Just return the booking ID for cancel
      message: "Booking cancelled successfully",
    };
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel booking",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}
