import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserState = query({
    args: { syncId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("userState")
            .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
            .first();
    },
});

export const updateUserState = mutation({
    args: {
        syncId: v.string(),
        currentTrack: v.optional(v.any()),
        queue: v.optional(v.array(v.any())),
        currentIndex: v.optional(v.number()),
        currentTime: v.optional(v.number()),
        volume: v.optional(v.number()),
        isShuffle: v.optional(v.boolean()),
        repeatMode: v.optional(v.number()),
        history: v.optional(v.array(v.any())),
        favorites: v.optional(v.array(v.any())),
        favoriteAlbums: v.optional(v.array(v.any())),
        favoriteArtists: v.optional(v.array(v.any())),
        userLanguage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("userState")
            .withIndex("by_syncId", (q) => q.eq("syncId", args.syncId))
            .first();

        const timestamp = Date.now();
        const updateData = { ...args, lastUpdated: timestamp };

        // Remove undefined values to avoid overwriting existing data with empty fields
        Object.keys(updateData).forEach(
            (key) => updateData[key] === undefined && delete updateData[key]
        );

        if (existing) {
            await ctx.db.patch(existing._id, updateData);
        } else {
            // Need all required fields for a new record. We will assume the frontend 
            // sends a complete state on initial sync or creation.
            await ctx.db.insert("userState", {
                syncId: args.syncId,
                currentTrack: args.currentTrack || null,
                queue: args.queue || [],
                currentIndex: args.currentIndex ?? -1,
                currentTime: args.currentTime ?? 0,
                volume: args.volume ?? 1.0,
                isShuffle: args.isShuffle ?? false,
                repeatMode: args.repeatMode ?? 0,
                history: args.history || [],
                favorites: args.favorites || [],
                favoriteAlbums: args.favoriteAlbums || [],
                favoriteArtists: args.favoriteArtists || [],
                userLanguage: args.userLanguage || "Telugu",
                lastUpdated: timestamp,
            });
        }
    },
});
