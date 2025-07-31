"use server"
// import { PrismaClient } from "@/generated/prisma";
// import IsSessionActive from "../validators/sessionData";
// import validateUser from "../validators/validateUser";
// const prisma = new PrismaClient();

// export default async function getUserDashBoardDataMain() {
//   try {
//     // Validate session
//     const sessionInfo = await IsSessionActive();
//     if (!sessionInfo.status || !sessionInfo.data?.id) {
//       return {
//         status: false,
//         message: sessionInfo.message || "Invalid session",
//         data: null,
//       };
//     }

//     const userId = sessionInfo.data.id;
//     // Validate user role
//     const userRoleValidation = await validateUser();
//     if (!userRoleValidation.status) {
//       return {
//         status: false,
//         message: userRoleValidation.message || "User role validation failed",
//         data: null,
//       };
//     }

//     // Fetch user details with related bookings, slots, payments, and payment history
//     const user = await prisma.user.findUnique({
//       where: {
//         id: userId,
//         is_active: true,
//         is_deleted: false,
//       },
//       select: {
//         id: true,
//         email: true,
//         full_name: true,
//         image_url: true,
//         phone_number: true,
//         address: true,
//         role: true,
//         last_login: true,
//         created_at: true,
//         updated_at: true,
//         bookings: {
//           where: {
//             is_active: true,
//             is_deleted: false,
//           },
//           select: {
//             id: true,
//             status: true,
//             booking_date: true,
//             amount: true,
//             created_at: true,
//             updated_at: true,
//             slot: {
//               select: {
//                 id: true,
//                 game_id: true,
//                 date: true,
//                 start_time: true,
//                 end_time: true,
//                 price: true,
//                 name: true,
//                 description: true,
//                 created_at: true,
//                 updated_at: true,
//                 game: {
//                   select: {
//                     id: true,
//                     name: true,
//                     description: true,
//                     image_url: true,
//                   },
//                 },
//               },
//             },
//             payments: {
//               select: {
//                 id: true,
//                 amount: true,
//                 reference_no: true,
//                 description: true,
//                 payment_type: true,
//                 payment_status: true,
//                 payment_mode: true,
//                 payment_desc_type: true,
//                 created_at: true,
//                 updated_at: true,
//               },
//             },
//           },
//           orderBy: {
//             booking_date: "desc",
//           },
//         },
//         payments: {
//           select: {
//             id: true,
//             amount: true,
//             reference_no: true,
//             description: true,
//             payment_type: true,
//             payment_status: true,
//             payment_mode: true,
//             payment_desc_type: true,
//             created_at: true,
//             updated_at: true,
//             booking_id: true,
//           },
//           where: {
//             OR: [
//               { created_by: userId },
//               { updated_by: userId },
//             ],
//           },
//           orderBy: {
//             created_at: "desc",
//           },
//         },
//       },
//     });

//     if (!user) {
//       return {
//         status: false,
//         message: "User not found",
//         data: null,
//       };
//     }

//     // Format the response to match the requested JSON structure
//     return {
//       status: true,
//       message: "User details fetched successfully",
//       data: {
//         user_info: {
//           id: user.id,
//           email: user.email,
//           full_name: user.full_name,
//           image_url: user.image_url,
//           phone_number: user.phone_number,
//           address: user.address,
//           role: user.role,
//           last_login: user.last_login?.toISOString(),
//           created_at: user.created_at.toISOString(),
//           updated_at: user.updated_at.toISOString(),
//         },
//         bookings: user.bookings.map((booking) => ({
//           id: booking.id,
//           status: booking.status,
//           booking_date: booking.booking_date.toISOString(),
//           amount: booking.amount.toString(),
//           created_at: booking.created_at.toISOString(),
//           updated_at: booking.updated_at.toISOString(),
//           slot: {
//             id: booking.slot.id,
//             game_id: booking.slot.game_id,
//             date: booking.slot.date.toISOString(),
//             start_time: booking.slot.start_time.toISOString(),
//             end_time: booking.slot.end_time.toISOString(),
//             price: booking.slot.price.toString(),
//             name: booking.slot.name,
//             description: booking.slot.description,
//             created_at: booking.slot.created_at.toISOString(),
//             updated_at: booking.slot.updated_at.toISOString(),
//             game: {
//               id: booking.slot.game.id,
//               name: booking.slot.game.name,
//               description: booking.slot.game.description,
//               image_url: booking.slot.game.image_url,
//             },
//           },
//           payments: booking.payments.map((payment) => ({
//             id: payment.id,
//             amount: payment.amount.toString(),
//             reference_no: payment.reference_no,
//             description: payment.description,
//             payment_type: payment.payment_type,
//             payment_status: payment.payment_status,
//             payment_mode: payment.payment_mode,
//             payment_desc_type: payment.payment_desc_type,
//             created_at: payment.created_at.toISOString(),
//             updated_at: payment.updated_at.toISOString(),
//           })),
//         })),
//         payment_history: user.payments.map((payment) => ({
//           id: payment.id,
//           amount: payment.amount.toString(),
//           reference_no: payment.reference_no,
//           description: payment.description,
//           payment_type: payment.payment_type,
//           payment_status: payment.payment_status,
//           payment_mode: payment.payment_mode,
//           payment_desc_type: payment.payment_desc_type,
//           created_at: payment.created_at.toISOString(),
//           updated_at: payment.updated_at.toISOString(),
//           booking_id: payment.booking_id,
//         })),
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching user details:", error);
//     return {
//       status: false,
//       message: "Internal server error",
//       data: null,
//     };
//   } finally {
//     await prisma.$disconnect();
//   }
// }





import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from "../validators/sessionData";
import validateUser from "../validators/validateUser";
const prisma = new PrismaClient();

export default async function getUserDashBoardDataMain() {
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

    const userId = sessionInfo.data.id;
    // Validate user role
    const userRoleValidation = await validateUser();
    if (!userRoleValidation.status) {
      return {
        status: false,
        message: userRoleValidation.message || "User role validation failed",
        data: null,
      };
    }

    // Fetch user details with related bookings, slots, payments, and payment history
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
        is_active: true,
        is_deleted: false,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        image_url: true,
        phone_number: true,
        address: true,
        role: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        bookings: {
          where: {
            is_active: true,
            is_deleted: false,
          },
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
          orderBy: {
            booking_date: "desc",
          },
        },
      },
    });

    if (!user) {
      return {
        status: false,
        message: "User not found",
        data: null,
      };
    }

    // Fetch payment history based on user's booking IDs
    const bookingIds = user.bookings.map(booking => booking.id);
    const paymentHistory = await prisma.payment.findMany({
      where: {
        booking_id: {
          in: bookingIds,
        },
      },
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
        booking_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    // Format the response to match the requested JSON structure
    return {
      status: true,
      message: "User details fetched successfully",
      data: {
        user_info: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          image_url: user.image_url,
          phone_number: user.phone_number,
          address: user.address,
          role: user.role,
          last_login: user.last_login?.toISOString(),
          created_at: user.created_at.toISOString(),
          updated_at: user.updated_at.toISOString(),
        },
        bookings: user.bookings.map((booking) => ({
          id: booking.id,
          status: booking.status,
          booking_date: booking.booking_date.toISOString(),
          amount: booking.amount.toString(),
          created_at: booking.created_at.toISOString(),
          updated_at: booking.updated_at.toISOString(),
          slot: {
            id: booking.slot.id,
            game_id: booking.slot.game_id,
            date: booking.slot.date.toISOString(),
            start_time: booking.slot.start_time.toISOString(),
            end_time: booking.slot.end_time.toISOString(),
            price: booking.slot.price.toString(),
            name: booking.slot.name,
            description: booking.slot.description,
            created_at: booking.slot.created_at.toISOString(),
            updated_at: booking.slot.updated_at.toISOString(),
            game: {
              id: booking.slot.game.id,
              name: booking.slot.game.name,
              description: booking.slot.game.description,
              image_url: booking.slot.game.image_url,
            },
          },
          payments: booking.payments.map((payment) => ({
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
        })),
        payment_history: paymentHistory.map((payment) => ({
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
          booking_id: payment.booking_id,
        })),
      },
    };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {
      status: false,
      message: "Internal server error",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}


// -----------------------------------------------------Response Dummy Data-----------------------------------------------
// {
//   "status": true,
//   "message": "User details fetched successfully",
//   "data": {
//     "user_info": {
//       "id": 1,
//       "email": "user@example.com",
//       "full_name": "John Doe",
//       "image_url": "https://example.com/image.jpg",
//       "phone_number": "1234567890",
//       "address": "123 Main St",
//       "role": "USER",
//       "last_login": "2025-07-18T11:18:00.000Z",
//       "created_at": "2025-07-01T00:00:00.000Z",
//       "updated_at": "2025-07-01T00:00:00.000Z"
//     },
//     "bookings": [
//       {
//         "id": 1,
//         "status": "CONFIRMED",
//         "booking_date": "2025-07-10T10:00:00.000Z",
//         "amount": "100.00",
//         "created_at": "2025-07-01T00:00:00.000Z",
//         "updated_at": "2025-07-01T00:00:00.000Z",
//         "slot": {
//           "id": 1,
//           "game_id": 1,
//           "date": "2025-07-10T00:00:00.000Z",
//           "start_time": "2025-07-10T10:00:00.000Z",
//           "end_time": "2025-07-10T11:00:00.000Z",
//           "price": "100.00",
//           "name": "Morning Slot",
//           "description": "Turf cricket slot",
//           "created_at": "2025-07-01T00:00:00.000Z",
//           "updated_at": "2025-07-01T00:00:00.000Z",
//           "game": {
//             "id": 1,
//             "name": "TURF_CRICKET",
//             "description": "Turf cricket game",
//             "image_url": "https://example.com/game.jpg"
//           }
//         },
//         "payments": [
//           {
//             "id": 1,
//             "amount": "100.00",
//             "reference_no": "TXN123",
//             "description": "Payment for booking",
//             "payment_type": "UPI",
//             "payment_status": "COMPLETED",
//             "payment_mode": "ONLINE",
//             "payment_desc_type": "REGULAR",
//             "created_at": "2025-07-01T00:00:00.000Z",
//             "updated_at": "2025-07-01T00:00:00.000Z"
//           }
//         ]
//       }
//     ],
//     "payment_history": [
//       {
//         "id": 1,
//         "amount": "100.00",
//         "reference_no": "TXN123",
//         "description": "Payment for booking",
//         "payment_type": "UPI",
//         "payment_status": "COMPLETED",
//         "payment_mode": "ONLINE",
//         "payment_desc_type": "REGULAR",
//         "created_at": "2025-07-01T00:00:00.000Z",
//         "updated_at": "2025-07-01T00:00:00.000Z",
//         "booking_id": 1
//       },
//       {
//         "id": 2,
//         "amount": "50.00",
//         "reference_no": "TXN456",
//         "description": "Advance payment",
//         "payment_type": "CASH",
//         "payment_status": "PENDING",
//         "payment_mode": "OFFLINE",
//         "payment_desc_type": "ADVANCE",
//         "created_at": "2025-07-02T00:00:00.000Z",
//         "updated_at": "2025-07-02T00:00:00.000Z",
//         "booking_id": null
//       }
//     ]
//   }
// }
