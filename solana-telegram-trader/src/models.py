from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class PortfolioPhase(str, Enum):
    COMPOUND = "compound"  # below $300 — full exits at TP
    MOONSHOT = "moonshot"  # $300–$1000 — leave dust after TP
    SCALE = "scale"  # at/above $1000 — can revisit sizing rules


@dataclass
class TokenSignal:
    mint: str
    source_chat: str
    source_message_id: int
    raw_text: str
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class TokenMetrics:
    mint: str
    holder_count: int | None = None
    top10_holder_pct: float | None = None
    bundled_launch: bool | None = None
    creator_wallet: str | None = None
    creator_rug_count: int = 0
    creator_token_count: int = 0
    liquidity_usd: float | None = None


@dataclass
class RiskAssessment:
    mint: str
    score: float  # 0 = safest, 100 = worst
    buy_usd: float
    reasons: list[str] = field(default_factory=list)
    skip: bool = False


@dataclass
class Position:
    mint: str
    entry_usd: float
    token_amount: float
    entry_price_usd: float
    opened_at: datetime
    source_chat: str
    dust_retained: bool = False
    dust_token_amount: float = 0.0
