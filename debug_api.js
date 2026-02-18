import fs from 'fs';
// node 18+ has native fetch, no import needed

const API_BASE_URL = 'https://musicbackend-pkfi.vercel.app';

async function test() {
    try {
        console.log("Fetching search results...");
        const searchRes = await fetch(`${API_BASE_URL}/search?query=latest%20telugu%20albums&filter=albums`);
        const searchData = await searchRes.json();

        if (searchData.length === 0) {
            console.log("No albums found");
            return;
        }

        const firstAlbum = searchData[0];
        const albumId = firstAlbum.browseId || firstAlbum.id;
        console.log(`Found Album ID: ${albumId}`);

        const albumRes = await fetch(`${API_BASE_URL}/album/${albumId}`);
        const albumData = await albumRes.json();

        fs.writeFileSync('debug_output.json', JSON.stringify(albumData, null, 2));
        console.log("Wrote debug_output.json");

    } catch (e) {
        console.error("Error:", e);
    }
}

test();
