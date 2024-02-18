export const socialPosts = `
  query IndexerQuery($accountId: String!, $startBlockHeight: numeric!) {
    dataplatform_near_feed_moderated_posts(
      where: {
        _and: [
          { account_id: {_in: [$accountId] } },
          { block_height: {_gte: $startBlockHeight} }
        ]
  }, order_by: [{ block_height: desc }], offset: 0, limit: 100) {
      account_id
      block_height
      block_timestamp
      content
      receipt_id
      accounts_liked
      last_comment_timestamp
      comments(order_by: {block_height: asc}) {
        account_id
        block_height
        block_timestamp
        content
      }
      verifications {
        human_provider
        human_valid_until
        human_verification_level
      }
      profile: account {
        name
        image
        tags
      }
    }
  }
`;
