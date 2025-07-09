const puppeteer = require("puppeteer");
const { readJSONFile, writeJSONFile } = require("./os_interaction.js");

const config = {
  usersPath: "./config/users.json", // Path to the tiktok users file
  postsPath: "./log/posts.json", // Path to the posts log file
  interval: 1 * 60000, // 1 minute in milliseconds
};

/**
 * Fetch TikTok posts for a specific user.
 * @param {string} user_id - The ID of the user to fetch posts for.
 * @returns {Promise<string[]>} - A promise that resolves to an array of video post URLs.
 */
async function fetchTikTokPosts(user_id) {
  console.log("[FETCH] Fetching TikTok posts for user:", user_id);

  const url = `https://urlebird.com/user/@${user_id}/`;
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('a[href*="/video/"]', { timeout: 30000 });

  const videoLinks = await page.$$eval('a[href*="/video/"]', (links) =>
    links.map((link) => link.href)
  );

  await browser.close();
  return videoLinks;
}

/**
 * Main function to orchestrate the fetching and logging of TikTok posts.
 */
async function main() {
  const users = await readJSONFile(config.usersPath);
  const postsLog = (await readJSONFile(config.postsPath)) || {};

  for await (const [user_id, { webhook }] of Object.entries(users)) {
    try {
      const videoLinks = await fetchTikTokPosts(user_id);
      const storedPosts = postsLog[user_id] || [];
      const newPosts = videoLinks.filter((link) => !storedPosts.includes(link));

      console.log(
        `[TIKTOK] Found ${newPosts.length} new posts for user ${user_id}`
      );

      for (const post of newPosts) {
        if (!storedPosts.includes(post)) {
          console.log(`[NEW POST] New post found for user ${user_id}: ${post}`);

          // Considering the post format is like "https://www.tiktok.com/@user_id/video/1234567890123456789"
          let videoIdPart = post.substring(27, 46); // Extracting the video ID part
          let message = `${user_id} has published a new video! https://tiktok.com/@${user_id}/video/${videoIdPart}/`;

          sendWebhookNotification(webhook, message);

          storedPosts.push(post);
        }
      }

      postsLog[user_id] = storedPosts;
    } catch (error) {
      console.error(
        `[ERROR] Failed to fetch posts for user ${user_id}:`,
        error
      );
    }
  }

  await writeJSONFile(config.postsPath, postsLog);
  setTimeout(main, config.interval);
}

/**
 * Send a webhook notification.
 * @param {string} webhook - The webhook URL to send the notification to.
 * @param {string} message - The message content to include in the notification.
 */
async function sendWebhookNotification(webhook, message) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (error) {
    console.error(`[ERROR] Failed to send webhook notification:`, error);
  }
}

// Start the main function
main();