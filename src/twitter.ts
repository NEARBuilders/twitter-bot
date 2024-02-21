import { createHmac } from "crypto";
import OAuth from "oauth-1.0a";

const TWITTER_CONSUMER_KEY = `${process.env.TWITTER_CONSUMER_KEY}`;
const TWITTER_CONSUMER_SECRET = `${process.env.TWITTER_CONSUMER_SECRET}`;
const TWITTER_ACCESS_TOKEN = `${process.env.TWITTER_ACCESS_TOKEN}`;
const TWITTER_TOKEN_SECRET = `${process.env.TWITTER_TOKEN_SECRET}`;

const NODE_ENV = process.env.NODE_ENV;

const oauth = new OAuth({
  consumer: { key: TWITTER_CONSUMER_KEY, secret: TWITTER_CONSUMER_SECRET },
  signature_method: "HMAC-SHA1",
  hash_function(base_string, key) {
    return createHmac("sha1", key).update(base_string).digest("base64");
  },
});

export async function sendTweet(tweetMessages: string[]) {
  if (NODE_ENV === "development") {
    console.log("Simulating Tweet:");

    // Log each tweet in the thread
    tweetMessages.forEach((tweet, index) => {
      console.log(`  ${index + 1}: ${tweet}`);
    });

    return;
  }

  const request_method = {
    url: "https://api.twitter.com/2/tweets",
    method: "POST",
  };

  try {
    const tweetIds: string[] = [];

    // Send each tweet in the thread
    for (let i = 0; i < tweetMessages.length; i++) {
      const tweetMessage = tweetMessages[i];

      const request_data: {
        url: string,
        method: string,
        body: string,
        headers: {
          "Content-Type": string,
          [key: string]: any
        }
      } = {
        ...request_method,
        body: JSON.stringify({ text: tweetMessage }),
        headers: {
          "Content-Type": "application/json",
          ...oauth.toHeader(oauth.authorize(request_method, { key: TWITTER_ACCESS_TOKEN, secret: TWITTER_TOKEN_SECRET })),
        },
      };

      const response = await fetch(request_data.url, {
        method: request_data.method,
        body: request_data.body,
        headers: request_data.headers,
      });

      const body = await response.json();

      // Store the ID of the tweet for linking the thread
      tweetIds.push(body.data.id);
    }

    // Link the tweets together as a thread
    for (let i = 1; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i];
      const previousTweetId = tweetIds[i - 1];

      request_method.url = `https://api.twitter.com/2/tweets/${tweetId}/reply`;

      const request_data = {
        ...request_method,
        body: JSON.stringify({ in_reply_to_tweet_id: previousTweetId }),
        headers: {
          "Content-Type": "application/json",
          ...oauth.toHeader(oauth.authorize(request_method, { key: TWITTER_ACCESS_TOKEN, secret: TWITTER_TOKEN_SECRET })),
        },
      };

      const response = await fetch(request_data.url, {
        method: request_data.method,
        body: request_data.body,
        headers: request_data.headers,
      });

      const body = await response.json();
    }
  } catch (e) {
    console.log(e);
  }
}
