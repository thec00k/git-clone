# Solana Telegram Trader

Autonomous Solana bot that watches Telegram group chats for token calls, sizes entries by risk ($10–$20), and manages exits by portfolio phase.

## Strategy (your rules)

| Rule | Bot behavior |
|------|----------------|
| Solana only | Parses Solana mints / pump.fun links |
| Max **$20** per buy until portfolio **$1000** | `MAX_BUY_USD=20`, enforced in risk scorer |
| Average **~$15** | Risk score maps high risk → $10, low risk → $20 |
| Risk inputs | Holder count, bundle detection, creator rug history |
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

## Architecture

```
Telegram groups → listener → mint parser → metrics APIs
  → risk scorer ($10–$20) → Jupiter buy → portfolio manager
  → exit loop (TP/SL/dust by phase)
```

## What you still need to configure

- **Which groups** to watch
- **Creator rug database** — plug your indexer into `apply_creator_rug_heuristic()`
- **Bundle detection** — wire slot-level buy clustering in `detect_bundled_launch()`
- **Sell-on-chat** — optional: parse "sell"/"out" messages from trusted callers

## Security

Running unattended requires storing Telegram session + wallet key on your VPS. Use a dedicated wallet with limited funds.

## Tests

```bash
pip install pytest pytest-asyncio
pytest tests/ -q
```
