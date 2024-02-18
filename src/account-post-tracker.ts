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

  // how to normalize markdown text into nice format?
  // should it break into multiple tweets if too long?

  // should it just share a link to it?

  // this should replace @accountIds with twitter handles
  // const projectTag = await nearQuery.lookupTwitterHandle("efiz.near").then((handle) => handle ?? "efiz.near"); 

  let message = `${JSON.parse(content).text}`;
  // need to add support for image posts + markdown links/images

  return message;
}
