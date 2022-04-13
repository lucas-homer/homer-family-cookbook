import { prisma } from "~/db.server";

export async function getCategories() {
  return prisma.category.findMany({});
}
