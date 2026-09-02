from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    telegram_api_id: int = 0
    telegram_api_hash: str = ""
    telegram_session_name: str = "trader_session"
    telegram_group_ids: str = ""

    solana_rpc_url: str = "https://api.mainnet-beta.solana.com"
    wallet_private_key: str = ""
    paper_trading: bool = True

    helius_api_key: str = ""
    birdeye_api_key: str = ""

    portfolio_phase_two_usd: float = 300.0
    portfolio_target_usd: float = 1000.0
    max_buy_usd: float = 20.0
    min_buy_usd: float = 10.0
    target_avg_buy_usd: float = 15.0

    take_profit_pct: float = 50.0
    dust_retention_pct: float = 10.0
    stop_loss_pct: float = 35.0
    max_risk_score: float = Field(default=85.0, description="Skip trades above this risk score")

    poll_interval_sec: float = 5.0

    def group_list(self) -> list[str]:
        if not self.telegram_group_ids.strip():
            return []
        return [g.strip() for g in self.telegram_group_ids.split(",") if g.strip()]


settings = Settings()
