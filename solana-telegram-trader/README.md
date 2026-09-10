# Solana Telegram Trader

Autonomous Solana bot that watches Telegram group chats for token calls, sizes entries by risk ($10–$20), and manages exits by portfolio phase.

## Strategy (your rules)

| Rule | Bot behavior |
|------|----------------|
| Solana only | Parses Solana mints / pump.fun links |
| Max **$20** per buy until portfolio **$1000** | `MAX_BUY_USD=20`, enforced in risk scorer |
| Average **~$15** | Risk score maps high risk → $10, low risk → $20 |
| Risk inputs | Holder count, Bubblemaps score/clusters/bundles, creator rug history |
| Below **$300** portfolio | **+50% TP = full exit** (compound small wins) |
| **$300–$1000** | **+50% TP = sell most, keep 10% dust** for moonshots |
| Stop loss | Default **-35%** (configurable) |

## Quick start

```bash
cd solana-telegram-trader
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env — keep PAPER_TRADING=true until tested
python -m src.main demo   # paper demo without Telegram
python -m src.main        # live listener (needs Telegram + optional APIs)
```

## Telegram setup

1. Create API credentials at [my.telegram.org](https://my.telegram.org)
2. Set `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`
3. Add group IDs or `@usernames` to `TELEGRAM_GROUP_IDS`
4. First run prompts for phone login; session saved locally

**Note:** Uses a **user session** (not Bot API) so it can read groups you're in. Automating user accounts may violate Telegram ToS.

## Live trading

1. Set `PAPER_TRADING=false`
2. Set `WALLET_PRIVATE_KEY` (base58)
3. Set `SOLANA_RPC_URL` (Helius recommended)
4. Optional: `HELIUS_API_KEY`, `BIRDEYE_API_KEY` for holder/liquidity data
5. Recommended: `BUBBLEMAPS_API_KEY` (Bubblemaps Pro) — same indicators pump.fun shows

## Bubblemaps / pump.fun health signals

Pump.fun embeds **Bubblemaps** in the coin UI. Bots cannot scrape that iframe reliably; we call the **Bubblemaps Data API** instead and feed the same metrics into sizing:

| Signal | Meaning | Bot effect |
|--------|---------|------------|
| `bubblemaps_score` (0–100) | Higher = more decentralized / healthier | High → bigger buy; very low → skip |
| `top_10_adjusted` | Cluster-aware top-10 supply share | High concentration → smaller buy / skip |
| `bundles` | Supply in launch bundles / top clusters | High → risk up |
| `fresh_wallets` | Supply held by wallets &lt;10 days old | High → risk up |
| `nakamoto_coefficient` | Entities needed for 50% supply | ≤3 → risk up |
| largest cluster share | Biggest related-wallet group | High → risk up |

Set thresholds in `.env` (`BUBBLEMAPS_MIN_SCORE`, `BUBBLEMAPS_MAX_TOP10_PCT`, `BUBBLEMAPS_MAX_BUNDLE_PCT`). Brand-new launches may not have a Bubblemaps map yet (404) — keep `BUBBLEMAPS_REQUIRED=false` unless you only trade coins with maps.

## Architecture

```
Telegram groups → listener → mint parser → Bubblemaps + metrics APIs
  → risk scorer ($10–$20) → Jupiter buy → portfolio manager
  → exit loop (TP/SL/dust by phase)
```

## What you still need to configure

- **Which groups** to watch
- **Bubblemaps Pro API key** (recommended for healthy-coin filtering)
- **Creator rug database** — plug your indexer into `apply_creator_rug_heuristic()`
- **Sell-on-chat** — optional: parse "sell"/"out" messages from trusted callers

## Security

Running unattended requires storing Telegram session + wallet key on your VPS. Use a dedicated wallet with limited funds.

## Tests

```bash
pip install pytest pytest-asyncio
pytest tests/ -q
```
