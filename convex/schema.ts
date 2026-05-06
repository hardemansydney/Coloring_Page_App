import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  pages: defineTable({
    originalImageId: v.optional(v.id("_storage")),
    processedImageId: v.optional(v.id("_storage")),
    originalUrl: v.optional(v.string()), 
    processedUrl: v.optional(v.string()),
    status: v.string(), // "pending", "processing", "completed", "failed"
    createdAt: v.number(),
    drawing: v.optional(v.string()), // Serialized JSON of drawing paths
  }),
});
