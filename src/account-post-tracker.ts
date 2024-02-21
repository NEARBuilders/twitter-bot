import { nearQuery } from "./near-query/client";
import * as marked from 'marked';

const TWEET_MAX_LENGTH = 280;

type TweetArgs = {
  content: any;
};

type TrackPostsResponse = {
  endBlockHeight: number;
  tweetMessages: string[][];
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

// Helper function to split text into chunks
function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let chunk = text.substr(currentIndex, maxLength);

    // Look for the last newline character within the chunk
    const lastNewline = chunk.lastIndexOf('\n');

    if (lastNewline !== -1 && lastNewline < maxLength) {
      // Split at the last newline character within the chunk
      chunk = chunk.substr(0, lastNewline);
      currentIndex += lastNewline + 1; // Move the current index to after the last newline character
    } else {
      // If no newline character found within the chunk or it's at the start, split at maxLength
      chunk = chunk.substr(0, maxLength);
      currentIndex += maxLength;
    }
    chunks.push(chunk);
  }

  return chunks;
}

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

  // Normalize Markdown text to plain text
  const plainText = (marked.parse(message) as string).replace(/<\/?[^>]+(>|$)/g, "");

  // Split into multiple tweets if necessary
  if (plainText.length > TWEET_MAX_LENGTH) {
    const chunks = chunkText(plainText, TWEET_MAX_LENGTH);
    console.log("Tweet message split into chunks: ", chunks);
    return chunks;
  } else {
    console.log("Tweet message: ", plainText);
    return [plainText];
  }
}

// TODO:
// 1. Normalize markdown text to a more readable format. How does Twitter handle markdown?
// 2. Determine if the content should be split into multiple tweets for longer texts.
// 3. Consider sharing a link for lengthy contents instead of the full text.

// Future Enhancements:
// - Add support for including images and handling markdown links/images in tweets.

//   if (message.length > 280) {
//     console.log("The message exceeds the maximum allowed length of 280 characters: ", message);
//   } else {
//     console.log("Tweet message: ", message);
//     return message;
//   }
// }



// If the text is like:

// ```
// "BUILDER UPDATE:  Feb 6, 2024\n(posted via Build DAO Gateway)\n---\n✅ DONE\n\nMerged develop into main for Build DAO gateway for full refactor w/ completely on-chain widgets\nPosted an idea for Create: Flexible Editor, Types, and Embeddings and created an initial version\nBuilt MVP for Build Box\nPosted an idea for Extracting and Publishing Types On-chain\nSet up a playground for the Urbit team as they experiment with the VM -- see that PR here (@0xMattB, question for you: Urbit team is forking the NearSocial/VM so that they can add accessors for Urbit Http API, do you  think this may be more practically exposed via SDKs?)\n\n---\n⏩ NEXT\n\nWrite documentation on how the Build DAO gateway works (create-every-app), tool on how to create your own\nCreate next steps for Build Box, to build a better hackathon platform\nUniversal feeds (every dao, every request, every proposal), and next steps for the Feed component as multiple projects are using this.\nNeed to check back in with the Iris project to create adapters for storing on Arweave\n\n #build #update\n"
// ```

// It should be like: [ 
//   "BUILDER UPDATE:  Feb 6, 2024\n(posted via Build DAO Gateway)", "✅ DONE\n\nMerged develop into main for Build DAO gateway for full refactor w/ completely on-chain widgets\nPosted an idea for Create: Flexible Editor, Types, and Embeddings and created an initial version\nBuilt MVP for Build Box\nPosted an idea for Extracting and Publishing Types On-chain\nSet up a playground for the Urbit team as they experiment with the VM -- see that PR here (@0xMattB, question for you: Urbit team is forking the NearSocial/VM so that they can add accessors for Urbit Http API, do you  think this may be more practically exposed via SDKs?)\n", "⏩ NEXT\n\nWrite documentation on how the Build DAO gateway works (create-every-app), tool on how to create your own\nCreate next steps for Build Box, to build a better hackathon platform\nUniversal feeds (every dao, every request, every proposal), and next steps for the Feed component as multiple projects are using this.\nNeed to check back in with the Iris project to create adapters for storing on Arweave\n\n #build #update\n"
// ]