import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    userState: defineTable({
        syncId: v.string(),
        currentTrack: v.any(), // Storing as any to accommodate Spotify/YouTube track objects
        queue: v.array(v.any()),
        currentIndex: v.number(),
        currentTime: v.number(),
        volume: v.number(),
        isShuffle: v.boolean(),
        repeatMode: v.number(),
        history: v.array(v.any()),
        favorites: v.array(v.any()),
        favoriteAlbums: v.array(v.any()),
        favoriteArtists: v.array(v.any()),
        userLanguage: v.optional(v.string()),
        lastUpdated: v.number(),
    }).index("by_syncId", ["syncId"]),
});
