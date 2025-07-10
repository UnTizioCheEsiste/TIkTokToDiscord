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
 * Fetch the TikTok profile image URL for a specific user.
 * @param {string} user_id - The ID of the user to fetch the profile image for.
 * @returns {Promise<string|null>} - A promise that resolves to the profile image URL or null if not found.
 */
async function fetchTikTokProfileImage(user_id) {
  console.log("[FETCH] Fetching TikTok profile image for user:", user_id);

  const url = `https://urlebird.com/user/@${user_id}/`;
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Select the only <img> element on the page
  const profileImageUrl = await page.$eval("img", img => img.src).catch(() => null);

  await browser.close();
  return profileImageUrl;
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
          let message = `https://tiktok.com/@${user_id}/video/${videoIdPart}/`;
          let profileImageUrl = await fetchTikTokProfileImage(user_id);

          sendWebhookNotification(webhook, message, user_id, profileImageUrl);

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
 * Sends a notification to a Discord webhook with a formatted embed message.
 *
 * @async
 * @function
 * @param {string} webhook - The Discord webhook URL to send the notification to.
 * @param {string} message - The message content to include in the notification.
 * @param {string} user_id - The TikTok user ID to display in the embed title.
 * @param {string} profileImageUrl - The URL of the user's profile image to use as the embed thumbnail.
 * @returns {Promise<void>} Resolves when the webhook notification has been sent.
 */
async function sendWebhookNotification(webhook, message, user_id, profileImageUrl) {
  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: message,   // fallback to content for Discord
        embeds: [{          // using embeds for better formatting
          title: `New TikTok Post from @${user_id}`,
          description: message,
          color: 0x69C9D0,  // TikTok color
          thumbnail: {
            url: profileImageUrl
          },
          timestamp: new Date().toISOString(),
        }]
      }),
    });
  } catch (error) {
    console.error(`[ERROR] Failed to send webhook notification:`, error);
  }
}

// Start the main function
main();