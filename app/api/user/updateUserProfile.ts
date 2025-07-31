"use server";
import { PrismaClient } from "@/generated/prisma";
import IsSessionActive from "../validators/sessionData";
import validateUser from "../validators/validateUser";
const prisma = new PrismaClient();

export default async function updateUserProfile(profileData: any) {
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

    // Validate input data
    if (!profileData || typeof profileData !== "object") {
      return {
        status: false,
        message: "Invalid profile data provided",
        data: null,
      };
    }

    // Prepare update data (only include provided fields)
    const updateData: { [key: string]: any } = {};

    if (
      profileData.full_name !== undefined &&
      profileData.full_name.trim() !== ""
    ) {
      updateData.full_name = profileData.full_name.trim();
    }

    if (profileData.phone_number !== undefined) {
      updateData.phone_number = profileData.phone_number.trim() || null;
    }

    if (profileData.address !== undefined) {
      updateData.address = profileData.address.trim() || null;
    }

    if (profileData.image_url !== undefined) {
      updateData.image_url = profileData.image_url || null;
    }

    // Add updated timestamp
    updateData.updated_at = new Date();

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
        is_active: true,
        is_deleted: false,
      },
      data: updateData,
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
      },
    });

    if (!updatedUser) {
      return {
        status: false,
        message: "User not found or update failed",
        data: null,
      };
    }

    // Format the response
    return {
      status: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        image_url: updatedUser.image_url,
        phone_number: updatedUser.phone_number,
        address: updatedUser.address,
        role: updatedUser.role,
        last_login: updatedUser.last_login?.toISOString(),
        created_at: updatedUser.created_at.toISOString(),
        updated_at: updatedUser.updated_at.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error updating user profile:", error);

    // Handle specific Prisma errors
    if (error.code === "P2002") {
      return {
        status: false,
        message: "A user with this information already exists",
        data: null,
      };
    }

    if (error.code === "P2025") {
      return {
        status: false,
        message: "User not found",
        data: null,
      };
    }

    return {
      status: false,
      message: "Internal server error while updating profile",
      data: null,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// -----------------------------------------------------Response Format-----------------------------------------------
// Success Response:
// {
//   "status": true,
//   "message": "Profile updated successfully",
//   "data": {
//     "id": 1,
//     "email": "user@example.com",
//     "full_name": "John Doe",
//     "image_url": "https://example.com/new-image.jpg",
//     "phone_number": "9876543210",
//     "address": "456 New Street, City",
//     "role": "USER",
//     "last_login": "2025-07-18T11:18:00.000Z",
//     "created_at": "2025-07-01T00:00:00.000Z",
//     "updated_at": "2025-07-20T15:30:00.000Z"
//   }
// }

// Error Response:
// {
//   "status": false,
//   "message": "Invalid session",
//   "data": null
// }

// -----------------------------------------------------Usage Example-----------------------------------------------
// import updateUserProfile from "@/app/api/user/updateUserProfile";
//
// const handleUpdateProfile = async () => {
//   const profileData = {
//     full_name: "John Doe Updated",
//     phone_number: "9876543210",
//     address: "New Address 123",
//     image_url: "https://example.com/new-image.jpg"
//   };
//
//   const response = await updateUserProfile(profileData);
//
//   if (response.status) {
//     console.log("Profile updated:", response.data);
//     // Show success toast
//   } else {
//     console.error("Update failed:", response.message);
//     // Show error toast
//   }
// };
