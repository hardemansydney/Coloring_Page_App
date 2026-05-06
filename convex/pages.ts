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

export const deletePage = mutation({
  args: { pageId: v.id("pages") },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.pageId);
    if (!page) return;

    // Clean up storage if IDs exist
    if (page.originalImageId) {
      await ctx.storage.delete(page.originalImageId);
    }
    if (page.processedImageId) {
      await ctx.storage.delete(page.processedImageId);
    }

    await ctx.db.delete(args.pageId);
  },
});

export const saveDrawing = mutation({
  args: { 
    pageId: v.id("pages"), 
    drawing: v.string() 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.pageId, {
      drawing: args.drawing,
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

      // Ensure we are using the HTTPS proxy URL for the physical device to access the image
      const sandboxId = "ipjonh1q6vj4r3aknu5c7";
      let imageUrlForOpenAI = page.originalUrl;
      
      if (imageUrlForOpenAI.includes("127.0.0.1") || imageUrlForOpenAI.includes("localhost")) {
        imageUrlForOpenAI = imageUrlForOpenAI.replace(/^http:\/\/(127\.0\.0\.1|localhost):(\d+)/, (match, host, port) => {
          return `https://${port}-${sandboxId}.app.cto.new`;
        });
      }

      // Step 1: Use GPT-4o Vision to describe the image as a coloring page
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this image in detail. When humans are identified in the image, ensure details of age, gender, race/skin color, and hair texture/style are included. Then, transform that description into a prompt for DALL-E 3 to create a kid-friendly, black and white cartoon coloring page. The coloring page should have thick bold black outlines, a pure white background, and no shading. Simplify complex details and remove small intricate patterns to make it easy for children to color." },
              {
                type: "image_url",
                image_url: {
                  url: imageUrlForOpenAI,
                },
              },
            ],
          },
        ],
      });

      const descriptionPrompt = response.choices[0].message.content || "A simple coloring page.";
      console.log("DESCRIPTION_PROMPT_START");
      console.log(descriptionPrompt);
      console.log("DESCRIPTION_PROMPT_END");

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
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      
      const arrayBuffer = await imageResponse.arrayBuffer();
      if (arrayBuffer.byteLength === 0) {
        throw new Error("Downloaded image is empty (0 bytes)");
      }
      
      console.log(`Downloaded image size: ${arrayBuffer.byteLength} bytes`);
      const storageId = await ctx.storage.store(new Blob([arrayBuffer]));

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
