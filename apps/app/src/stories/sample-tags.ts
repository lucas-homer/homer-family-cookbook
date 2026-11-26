import type { Tag } from "@/lib/tags";

// A slice of the real cookbook's 53 tags, with recipe counts.
const raw: [string, string, number][] = [
  ["course", "Mains", 22], ["course", "Cookies & Bars", 19], ["course", "Sides", 15], ["course", "Desserts", 11],
  ["course", "Breads", 9], ["course", "Breakfast", 8], ["course", "Soups", 7], ["course", "Salads", 6],
  ["course", "Appetizers", 5], ["course", "Drinks", 3],
  ["ingredient", "Chocolate", 9], ["ingredient", "Chicken", 8], ["ingredient", "Peanut Butter", 4], ["ingredient", "Pumpkin", 3],
  ["kind", "Casserole", 6], ["kind", "Slow Cooker", 4],
  ["occasion", "Christmas", 14], ["occasion", "Thanksgiving", 7], ["occasion", "Potluck", 6], ["occasion", "Easter", 3],
  ["family", "Grandma Homer", 12], ["family", "Grandma Hiller", 9], ["family", "Grandma Raske", 6],
  ["practical", "Make Ahead", 10], ["practical", "Kid Favorite", 7], ["practical", "No-Bake", 4],
];

export const sampleTags: Tag[] = raw.map(([tagGroup, name, count], i) => ({ id: i + 1, tagGroup, name, count }));
export const tagByName = (name: string) => sampleTags.find((t) => t.name === name)!;
