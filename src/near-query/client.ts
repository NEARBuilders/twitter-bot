import { socialPosts } from './queries';
import { GraphQLResponse, fetchGraphQL } from "./config";

class NearQuery {
  async fetchContractReceipts({
    startBlockHeight,
  }: {
    startBlockHeight: number;
  }): Promise<GraphQLResponse> {
    const { errors, data } = await fetchGraphQL({
      query: socialPosts,
      hasuraRole: "dataplatform_near",
      operationName: "IndexerQuery",
      variables: { accountId: `${process.env.ACCOUNT_ID}`, startBlockHeight },
    });

    if (errors) {
      return { errors };
    }

    try {
      const parsedData = data.dataplatform_near_feed_moderated_posts.map(parseReceiptData);
      return { data: parsedData };
    } catch (error: any) {
      return { errors: [{ message: `Error parsing args: ${error.message}` }] };
    }
  }

  // Fetch the Twitter handle from the near.social contract
  async lookupTwitterHandle(accountId: string): Promise<string | null> {
    const response = await fetch("https://api.near.social/get", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        keys: [`${accountId}/profile/**`],
      }),
    });

    const data = await response.json();
    const twitterHandleRaw = data[accountId]?.profile?.linktree?.twitter;

    if (twitterHandleRaw) {
      // Remove unwanted patterns and characters
      const sanitizedHandle = twitterHandleRaw
        .replace(/^(https?:\/\/)?(www\.)?twitter\.com\//, "") // Remove URL prefixes
        .replace(/[^a-zA-Z0-9_]/g, "") // Remove invalid characters
        .substring(0, 15); // Enforce max length of 15 characters

      return `@${sanitizedHandle}`;
    } else {
      return null;
    }
  }
}

export const nearQuery = new NearQuery();

// Helper function to parse the receipt data
function parseReceiptData(receiptData: any) {
  // Check if receiptData is a string
  try {
    if (typeof receiptData === 'string') {
      try {
        // Try parsing the string as JSON
        const parsedData = JSON.parse(receiptData);
        return parsedData;
      } catch (e: any) {
        throw new Error(`Failed to parse args for data ${JSON.stringify(receiptData)}: ${e.message} `);
      }
    } else if (typeof receiptData === 'object' && receiptData !== null) {
      // If receiptData is already an object, return it directly
      return receiptData;
    } else {
      // If receiptData is neither a string nor an object, handle accordingly
      throw new Error(`Unsupported type for receiptData: ${typeof receiptData} `);
    }
  } catch (error: any) {
    throw new Error(`Error parsing receipt data: ${error.message} `);
  }

}
