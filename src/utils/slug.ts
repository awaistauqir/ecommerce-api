import { Model } from "mongoose";

/**
 * Converts a string to a URL-friendly slug
 * Example: "Mechanical Keyboard RGB" → "mechanical-keyboard-rgb"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug by appending a number if needed
 * Example: "mechanical-keyboard", "mechanical-keyboard-1", etc.
 */
export async function generateUniqueSlug<T>(
  model: Model<T>,
  name: string,
  id?: string,
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await model.findOne({ slug, _id: { $ne: id } });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
