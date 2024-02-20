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

// Extracts mentions from near.social posts (@)
// taken from mob.near/widget/MainPage.N.Common.Compose
const extractMentions = (text: string): string[] => {
  const mentionRegex =
    /@((?:(?:[a-z\d]+[-_])*[a-z\d]+\.)*(?:[a-z\d]+[-_])*[a-z\d]+)/gi;
  mentionRegex.lastIndex = 0;
  const accountIds = new Set<string>();
  const matches = text.matchAll(mentionRegex);

  for (const match of matches) {
    if (
      match !== undefined && match.index !== undefined && match.input !== undefined &&
      !/[\w`]/.test(match.input.charAt(match.index - 1)) &&
      !/[/\w`]/.test(match.input.charAt(match.index + match[0].length)) &&
      match[1].length >= 2 &&
      match[1].length <= 64
    ) {
      accountIds.add(match[1].toLowerCase());
    }
  }

  return [...accountIds];
};

// Formats the tweet from near.social post content
async function formatTweetMessage(tweetArgs: TweetArgs) {
  const { content } = tweetArgs;

  const contentObj = JSON.parse(content);
  let message = contentObj.text;

  // Replace @accountIds with actual Twitter handles
  const mentions = extractMentions(contentObj.text);
  if (mentions.length) {
    const replacements = await Promise.all(
      mentions.map(async (accountId) => ({
        accountId,
        handle: await nearQuery.lookupTwitterHandle(accountId).then((handle) => handle ?? accountId),
      }))
    );

    for (const { accountId, handle } of replacements) {
      message = message.replace(new RegExp(`@${accountId}`, 'g'), handle);
    }
  }

  // TODO:
  // 1. Normalize markdown text to a more readable format.
  // 2. Determine if the content should be split into multiple tweets for longer texts.
  // 3. Consider sharing a link for lengthy contents instead of the full text.

  // Future Enhancements:
  // - Add support for including images and handling markdown links/images in tweets.

  if (message.length > 280) {
    console.log("The message exceeds the maximum allowed length of 280 characters: ", message);
  } else {
    console.log("Tweet message: ", message);
    return message;
  }
}
