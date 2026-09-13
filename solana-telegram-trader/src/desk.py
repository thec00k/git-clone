"""Orchestrates signal → risk → buy → exit monitoring."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from src.analyzer.risk_scorer import score_token
from src.analyzer.token_metrics import fetch_token_metrics
from src.config import settings
from src.models import Position, TokenSignal
from src.portfolio.manager import PortfolioManager
from src.trading.jupiter_trader import JupiterTrader

logger = logging.getLogger(__name__)


class TradingDesk:
    def __init__(self, starting_cash_usd: float = 100.0):
        self.portfolio = PortfolioManager(cash_usd=starting_cash_usd)
        self.trader = JupiterTrader()
        self._seen_mints: set[str] = set()
        self._mark_prices: dict[str, float] = {}

    async def handle_signal(self, signal: TokenSignal) -> None:
        if signal.mint in self._seen_mints or signal.mint in self.portfolio.open_positions:
            logger.debug("Skip duplicate mint %s", signal.mint[:8])
            return
        self._seen_mints.add(signal.mint)

        metrics = await fetch_token_metrics(signal.mint)
        risk = score_token(metrics)
        logger.info(
            "Signal %s from %s | risk=%.0f buy=$%.2f | %s",
            signal.mint[:8],
            signal.source_chat,
            risk.score,
            risk.buy_usd,
            "; ".join(risk.reasons),
        )

        if risk.skip:
            return

        if not self.portfolio.can_open_new_buy(risk.buy_usd, self._mark_prices):
            logger.warning("Insufficient cash for $%.2f buy", risk.buy_usd)
            return

        result = await self.trader.buy_usd(signal.mint, risk.buy_usd)
        self._mark_prices[signal.mint] = result.price_usd
        position = Position(
            mint=signal.mint,
            entry_usd=result.usd_notional,
            token_amount=result.token_amount,
            entry_price_usd=result.price_usd,
            opened_at=datetime.now(timezone.utc),
            source_chat=signal.source_chat,
        )
        self.portfolio.register_buy(position)
        logger.info(
            "Opened %s | phase=%s | portfolio=$%.2f",
            signal.mint[:8],
            self.portfolio.phase.value,
            self.portfolio.total_value_usd(self._mark_prices),
        )

    async def monitor_exits(self) -> None:
        while True:
            for mint, pos in list(self.portfolio.open_positions.items()):
                price = await self.trader._estimate_price(mint)
                self._mark_prices[mint] = price

                if self.portfolio.should_stop_loss(pos, price):
                    result = await self.trader.sell_tokens(mint, pos.token_amount)
                    self.portfolio.register_partial_exit(mint, pos.token_amount, result.usd_notional)
                    logger.info("STOP LOSS %s @ $%.6f", mint[:8], price)
                    continue

                sell_amt, dust_amt = self.portfolio.exit_plan_at_take_profit(pos, price)
                if sell_amt > 0:
                    result = await self.trader.sell_tokens(mint, sell_amt)
                    self.portfolio.register_partial_exit(mint, sell_amt, result.usd_notional, dust_amt)
                    logger.info(
                        "TAKE PROFIT %s | sold %.4f kept dust %.4f | phase=%s",
                        mint[:8],
                        sell_amt,
                        dust_amt,
                        self.portfolio.phase.value,
                    )

            await asyncio.sleep(settings.poll_interval_sec)


async def run_desk_paper_demo() -> None:
    """Simulate a few signals without Telegram."""
    desk = TradingDesk(starting_cash_usd=100.0)
    asyncio.create_task(desk.monitor_exits())

    demo_signals = [
        TokenSignal("3Ekm1ZWcUicjfwnEPVnaCrv6vZn9DeBiJBJoeFZ3pump", "demo_chat", 1, "demo ca"),
    ]
    for sig in demo_signals:
        await desk.handle_signal(sig)

    await asyncio.sleep(settings.poll_interval_sec + 1)
