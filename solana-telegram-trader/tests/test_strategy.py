import pytest

from src.analyzer.risk_scorer import score_token
from src.models import PortfolioPhase, Position, TokenMetrics
from src.parser.token_parser import extract_mints
from src.portfolio.manager import PortfolioManager


def test_extract_mints_pump_link():
    text = "ape this https://pump.fun/coin/3Ekm1ZWcUicjfwnEPVnaCrv6vZn9DeBiJBJoeFZ3pump now"
    mints = extract_mints(text)
    assert "3Ekm1ZWcUicjfwnEPVnaCrv6vZn9DeBiJBJoeFZ3pump" in mints


def test_risk_scorer_high_risk_smaller_buy():
    safe = score_token(
        TokenMetrics(mint="x", holder_count=800, bundled_launch=False, creator_rug_count=0)
    )
    risky = score_token(
        TokenMetrics(mint="x", holder_count=30, bundled_launch=True, creator_rug_count=2)
    )
    assert risky.score > safe.score
    assert risky.buy_usd < safe.buy_usd
    assert 10 <= risky.buy_usd <= 20
    assert 10 <= safe.buy_usd <= 20


def test_risk_scorer_skips_extreme_risk():
    extreme = score_token(
        TokenMetrics(
            mint="x",
            holder_count=10,
            bundled_launch=True,
            creator_rug_count=3,
            top10_holder_pct=80,
            liquidity_usd=1000,
        )
    )
    assert extreme.skip is True


def test_portfolio_phase_transitions():
    pm = PortfolioManager(cash_usd=250.0)
    assert pm.phase == PortfolioPhase.COMPOUND
    pm.cash_usd = 350.0
    assert pm.phase == PortfolioPhase.MOONSHOT
    pm.cash_usd = 1100.0
    assert pm.phase == PortfolioPhase.SCALE


def test_compound_phase_full_exit_at_tp():
    pm = PortfolioManager(cash_usd=200.0)
    pos = Position(
        mint="abc",
        entry_usd=15,
        token_amount=1000,
        entry_price_usd=0.015,
        opened_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        source_chat="test",
    )
    sell, dust = pm.exit_plan_at_take_profit(pos, current_price_usd=0.023)
    assert sell == 1000
    assert dust == 0


def test_moonshot_phase_keeps_dust_at_tp():
    pm = PortfolioManager(cash_usd=400.0)
    pos = Position(
        mint="abc",
        entry_usd=15,
        token_amount=1000,
        entry_price_usd=0.015,
        opened_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        source_chat="test",
    )
    sell, dust = pm.exit_plan_at_take_profit(pos, current_price_usd=0.023)
    assert sell == 900
    assert dust == 100
