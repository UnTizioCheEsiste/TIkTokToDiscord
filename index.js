const puppeteer = require('puppeteer');
const { readJSONFile, writeJSONFile } = require('./os_interaction.js');

const config = {
    usersPath: './config/users.json',   // Path to the tiktok users file
    postsPath: './log/posts.json',      // Path to the posts log file
    interval: 1 * 60000,                // 1 minute in milliseconds
}

async function fetchTikTokPosts(user_id) {
    console.log('[FETCH] Fetching TikTok posts for user:', user_id);

    const url = `https://www.tiktok.com/@${user_id}`;
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('a[href*="/video/"]', { timeout: 30000 });

    const videoLinks = await page.$$eval('a[href*="/video/"]', links =>
        links.map(link => link.href)
    );

    await browser.close();
    return videoLinks;
}

async function main() {
    const users = await readJSONFile(config.usersPath);
    const postsLog = await readJSONFile(config.postsPath) || {};

    for await (const [user_id, { webhook }] of Object.entries(users)) {
        try {
            const videoLinks = await fetchTikTokPosts(user_id);
            const storedPosts = postsLog[user_id] || [];
            const newPosts = videoLinks.filter(link => !storedPosts.includes(link));

            console.log(`[TIKTOK] Found ${newPosts.length} new posts for user ${user_id}`);

            for (const id of newPosts) {
                if (!storedPosts.includes(id)) {
                    console.log(`[NEW POST] New post found for user ${user_id}: ${id}`);

                    sendWebhookNotification(webhook, link);

                    storedPosts.push(id);
                }
            }

            postsLog[user_id] = storedPosts;
        } catch (error) {
            console.error(`[ERROR] Failed to fetch posts for user ${user_id}:`, error);
        }
    }

    await writeJSONFile(config.postsPath, postsLog);
    setTimeout(main, config.interval);
}

async function sendWebhookNotification(webhook, message) {
    try {
        await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
    } catch (error) {
        console.error(`[ERROR] Failed to send webhook notification:`, error);
    }
}

main();