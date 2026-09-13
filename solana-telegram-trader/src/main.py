#!/usr/bin/env python3
"""Solana Telegram call-group trading bot."""

from __future__ import annotations

import asyncio
import logging
import sys

from src.config import settings
from src.desk import TradingDesk, run_desk_paper_demo
from src.telegram.listener import TelegramGroupListener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "demo":
        await run_desk_paper_demo()
        return

    if not settings.telegram_api_id or not settings.telegram_api_hash:
        logger.error("Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env")
        sys.exit(1)

    desk = TradingDesk(starting_cash_usd=100.0)
    asyncio.create_task(desk.monitor_exits())

    listener = TelegramGroupListener(desk.handle_signal)
    logger.info(
        "Starting desk | paper=%s | phase targets $%.0f → $%.0f | max buy $%.0f",
        settings.paper_trading,
        settings.portfolio_phase_two_usd,
        settings.portfolio_target_usd,
        settings.max_buy_usd,
    )
    await listener.start()


if __name__ == "__main__":
    asyncio.run(main())
