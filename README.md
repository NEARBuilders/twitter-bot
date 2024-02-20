# How to run

```bash
# Install bun
curl -fsSL https://bun.sh/install | bash # for macOS, Linux, and WSL

bun install

# dev, simulates tweets to console
bun run dev

# Create .env.local and get oauth-1.0a credentials from twitter developer portal
cp .env.example .env.local

# prod, sends tweets to bot
bun run build
bun run start

```

# Cross posting Near Social to Twitter

To use, configure the Twitter API keys and NEAR_ACCOUNT_ID in .env

### TODO:
- [ ] Normalize markdown text to a more readable format.
- [ ] Determine if the content should be split into multiple tweets for longer texts.
- [ ] Consider sharing a link for lengthy contents instead of the full text.
- [ ] Replace @accountIds with actual Twitter handles.
  Example: Replace near account IDs with Twitter handles using a lookup function.
  const userTag = await nearQuery.lookupTwitterHandle("efiz.near").then((handle) => handle ?? "efiz.near");
- [ ] Add support for including images and handling markdown links/images in tweets.
