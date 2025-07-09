# TikTokToDiscord

This program allows you to track a TikTok user's new posts and send notifications to a Discord channel via a webhook.

## Setup Instructions

1. **Clone or Download the Repository**
    Download or clone this repository to your local machine.

2. **Install Dependencies**
    Make sure you have [Node.js](https://nodejs.org/) installed. Then, in the project directory, run:
    ```
    npm install
    ```

3. **Configure Users and Webhook**
    - Find the TikTok username you want to track. You can find this in the user's profile URL or in the search bar on TikTok.
    - Open or create the file `config/users.json`.
    - Add your TikTok username and Discord webhook URL in the following format:

      ```json
        {
            "tiktok_username": {
                "webhook": "https://discord.com/api/webhooks/your_webhook_url"
            }
        }
      ```

    - You can add multiple users by adding more objects to the array.

4. **Adjust Search Interval (Optional)**
    - By default, the interval between TikTok checks is set in the `config` section of `index.js`.
    - To change how often the program checks for new posts, open `index.js` and modify the interval value (in milliseconds).

5. **Run the Program**
    ```
    node .
    ```
