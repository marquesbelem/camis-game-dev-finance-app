import { prisma } from "@/lib/prisma";

/**
 * Gets or creates the default "Pet" category for a user.
 * Ensures that vaccine/pet expenses are automatically categorized under "Pet".
 */
export async function getOrCreatePetCategory(userId: string): Promise<{ id: string; name: string }> {
  // 1. Check if user or system-default category "Pet" / "Pets" exists
  let category = await prisma.category.findFirst({
    where: {
      name: { in: ["Pet", "Pets", "PET", "pets", "pet"], mode: "insensitive" },
      OR: [
        { userId: null },
        { userId },
      ],
    },
  });

  if (!category) {
    // 2. Create the category if not found
    category = await prisma.category.create({
      data: {
        name: "Pet",
        colorCode: "#f43f5e",
        iconRef: "Dog",
        userId,
        isSystemDefault: false,
      },
    });
  }

  return { id: category.id, name: category.name };
}
