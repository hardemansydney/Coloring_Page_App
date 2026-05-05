import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from "openai";

// Using the provided API key or environment variable
const getOpenAI = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }
  return new OpenAI({ apiKey });
};

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const createPage = mutation({
  args: { originalImageId: v.id("_storage") },
  handler: async (ctx, args) => {
    console.log("createPage mutation called with originalImageId:", args.originalImageId);
    const pageId = await ctx.db.insert("pages", {
      originalImageId: args.originalImageId,
      status: "pending",
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, api.pages.processImage, { pageId });
    return pageId;
  },
});

export const getPage = query({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) return null;
    return {
      ...page,
      originalUrl: page.originalImageId ? await ctx.storage.getUrl(page.originalImageId) : null,
      processedUrl: page.processedImageId ? await ctx.storage.getUrl(page.processedImageId) : null,
    };
  },
});

export const listPages = query({
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").order("desc").collect();
    return Promise.all(
      pages.map(async (page) => ({
        ...page,
        originalUrl: page.originalImageId ? await ctx.storage.getUrl(page.originalImageId) : null,
        processedUrl: page.processedImageId ? await ctx.storage.getUrl(page.processedImageId) : null,
      }))
    );
  },
});

export const updateStatus = internalMutation({
  args: { 
    pageId: v.id("pages"), 
    status: v.string(), 
    processedImageId: v.optional(v.id("_storage")) 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pageId, {
      status: args.status,
      processedImageId: args.processedImageId,
    });
  },
});

export const processImage = action({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const page = await ctx.runQuery(api.pages.getPage, { pageId: args.pageId });
    if (!page || !page.originalUrl) return;

    await ctx.runMutation(internal.pages.updateStatus, {
      pageId: args.pageId,
      status: "processing",
    });

    try {
      const openai = getOpenAI();
      console.log("Processing image with pageId:", args.pageId);
      // Step 1: Use GPT-4o Vision to describe the image as a coloring page
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image in detail. Then, transform that description into a prompt for DALL-E 3 to create a kid-friendly, black and white cartoon coloring page. The coloring page should have thick bold black outlines, a pure white background, and no shading. Simplify complex details and remove small intricate patterns to make it easy for children to color." },
              {
                type: "image_url",
                image_url: {
                  url: page.originalUrl,
                },
              },
            ],
          },
        ],
      });

      const descriptionPrompt = response.choices[0].message.content || "A simple coloring page.";

      // Step 2: Generate the coloring page using DALL-E 3
      const imageGen = await openai.images.generate({
        model: "dall-e-3",
        prompt: `A kid-friendly black and white cartoon coloring page. Bold thick black outlines, pure white background, no shading, no gray areas. Simple shapes. Based on: ${descriptionPrompt}`,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });

      const imageUrl = imageGen.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image generated");

      // Step 3: Fetch the generated image and store it in Convex
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const storageId = await ctx.storage.store(imageBlob);

      await ctx.runMutation(internal.pages.updateStatus, {
        pageId: args.pageId,
        status: "completed",
        processedImageId: storageId,
      });
    } catch (error) {
      console.error(error);
      await ctx.runMutation(internal.pages.updateStatus, {
        pageId: args.pageId,
        status: "failed",
      });
    }
  },
});
