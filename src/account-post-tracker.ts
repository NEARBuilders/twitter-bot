import { nearQuery } from "./near-query/client";

type TweetArgs = {
  content: any;
};

type TrackPostsResponse = {
  endBlockHeight: number;
  tweetMessages: string[];
};

export async function trackPostChanges(startBlockHeight: number): Promise<TrackPostsResponse | undefined> {
  const { errors, data } = await nearQuery.fetchContractReceipts({
    startBlockHeight: startBlockHeight,
  });

  if (errors) {
    console.log("Error fetching receipts", errors);
    return;
  }

  if (!data.length) {
    console.log("No new status update receipts found");
    return;
  }

  console.log(data.length, "status update receipts found");

  const endBlockHeight = data[data.length - 1].block_height;

  const tweetMessages = await Promise.all(
    data.map(async (receipt: any) => {
      const tweetArgs: TweetArgs = {
        content: receipt.content,
      };

      return await formatTweetMessage(tweetArgs);
    })
  );

  return {
    endBlockHeight,
    tweetMessages
  };
}

async function formatTweetMessage(tweetArgs: TweetArgs) {
  const { content } = tweetArgs;

  // Initial message formatting from JSON content.
  let message = `${JSON.parse(content).text}`;

  // TODO:
  // 1. Normalize markdown text to a more readable format.
  // 2. Determine if the content should be split into multiple tweets for longer texts.
  // 3. Consider sharing a link for lengthy contents instead of the full text.
  // 4. Replace @accountIds with actual Twitter handles.
  // Example: Replace near account IDs with Twitter handles using a lookup function.
  // const userTag = await nearQuery.lookupTwitterHandle("efiz.near").then((handle) => handle ?? "efiz.near");

  // Future Enhancements:
  // - Add support for including images and handling markdown links/images in tweets.

  return message;
}
