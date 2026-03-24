"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function createRoomAction(name: string) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!restaurantId) return { error: "No autorizado" };

    const room = await (prisma as any).room.create({
      data: {
        restaurantId,
        name,
        width: 800,
        height: 600
      }
    });

    revalidatePath("/dashboard/zapiqr/rooms");
    return { success: true, room };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "Ya existe un salón con ese nombre" };
    }
    return { error: error.message };
  }
}

export async function deleteRoomAction(roomId: string) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!restaurantId) return { error: "No autorizado" };

    await (prisma as any).room.delete({
      where: { id: roomId, restaurantId }
    });

    revalidatePath("/dashboard/zapiqr/rooms");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createTableAction(roomId: string, name: string) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!restaurantId) return { error: "No autorizado" };

    const table = await (prisma as any).restaurantTable.create({
      data: {
        restaurantId,
        roomId,
        name,
        x: 50,
        y: 50,
        width: 80,
        height: 80,
        shape: "square"
      }
    });

    revalidatePath("/dashboard/zapiqr/rooms");
    return { success: true, table };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { error: "Ya existe una mesa con ese nombre" };
    }
    return { error: error.message };
  }
}

export async function deleteTableAction(tableId: string) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!restaurantId) return { error: "No autorizado" };

    await (prisma as any).restaurantTable.delete({
      where: { id: tableId, restaurantId }
    });

    revalidatePath("/dashboard/zapiqr/rooms");
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateTablePositionAction(tableId: string, x: number, y: number, width: number, height: number, shape: string) {
  try {
    const session = await auth();
    const restaurantId = session?.user?.restaurantId;
    if (!restaurantId) return { error: "No autorizado" };

    await (prisma as any).restaurantTable.update({
      where: { id: tableId, restaurantId },
      data: { x, y, width, height, shape }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
