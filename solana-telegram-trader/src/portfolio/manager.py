"""Portfolio phase logic and position exit rules."""

from __future__ import annotations

from src.config import settings
from src.models import PortfolioPhase, Position


class PortfolioManager:
    def __init__(self, cash_usd: float = 100.0, open_positions: dict[str, Position] | None = None):
        self.cash_usd = cash_usd
        self.open_positions: dict[str, Position] = open_positions or {}

    @property
    def phase(self) -> PortfolioPhase:
        total = self.total_value_usd()
        if total >= settings.portfolio_target_usd:
            return PortfolioPhase.SCALE
        if total >= settings.portfolio_phase_two_usd:
            return PortfolioPhase.MOONSHOT
        return PortfolioPhase.COMPOUND

    def total_value_usd(self, mark_prices: dict[str, float] | None = None) -> float:
        mark_prices = mark_prices or {}
        positions_value = sum(
            pos.token_amount * mark_prices.get(mint, pos.entry_price_usd)
            for mint, pos in self.open_positions.items()
        )
        return self.cash_usd + positions_value

    def can_open_new_buy(self, buy_usd: float, mark_prices: dict[str, float] | None = None) -> bool:
        if self.total_value_usd(mark_prices) >= settings.portfolio_target_usd:
            # Still allow trades at target; sizing cap handled elsewhere
            pass
        return buy_usd <= settings.max_buy_usd and buy_usd <= self.cash_usd

    def exit_plan_at_take_profit(self, position: Position, current_price_usd: float) -> tuple[float, float]:
        """
        Returns (tokens_to_sell, tokens_to_keep_as_dust).
        COMPOUND phase: sell 100% at +50% TP.
        MOONSHOT/SCALE: sell most, retain dust_retention_pct for moonshots.
        """
        gain_pct = ((current_price_usd - position.entry_price_usd) / position.entry_price_usd) * 100
        if gain_pct < settings.take_profit_pct:
            return 0.0, position.token_amount

        if self.phase == PortfolioPhase.COMPOUND:
            return position.token_amount, 0.0

        keep = position.token_amount * (settings.dust_retention_pct / 100)
        sell = position.token_amount - keep
        return sell, keep

    def should_stop_loss(self, position: Position, current_price_usd: float) -> bool:
        loss_pct = ((position.entry_price_usd - current_price_usd) / position.entry_price_usd) * 100
        return loss_pct >= settings.stop_loss_pct

    def register_buy(self, position: Position) -> None:
        self.cash_usd -= position.entry_usd
        self.open_positions[position.mint] = position

    def register_partial_exit(
        self,
        mint: str,
        sold_tokens: float,
        proceeds_usd: float,
        dust_tokens: float = 0.0,
    ) -> None:
        pos = self.open_positions.get(mint)
        if not pos:
            return
        pos.token_amount = dust_tokens
        pos.dust_retained = dust_tokens > 0
        pos.dust_token_amount = dust_tokens
        self.cash_usd += proceeds_usd
        if pos.token_amount <= 0:
            del self.open_positions[mint]
