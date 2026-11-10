# Initial stable Next baseline follows supported majors

**Status:** Accepted. **Decision:** 2026-11-06.

The first stable ts-restless v4 baseline supports Next15 and Next16 in the Next and serverless integrations. Exclude upstream-unsupported Next12–14; retain supported Pages API, App Router and Pages Edge entry points. Router style alone does not imply an old Next major.

Keeping unsupported native majors expands declaration and runtime obligations without a current upstream support commitment. The narrower initial baseline follows the reviewed official lifecycle policy and strict same-major consumer/native checks. Official policy changes trigger another review rather than automatically changing our peers.

Published historical packages remain available. Consumers need explicit upgrade guidance or matched fallback versions; this initial decision does not retire a shipped stable fork promise.

Sources: [approved baseline and verification](../plans/006-next-supported-majors.md), [support policy](../support-policy.md), [consumer migration](../../apps/docs/content/docs/ts-restless-migration.mdx). [Roadmap](../roadmap.md) records delivery.
