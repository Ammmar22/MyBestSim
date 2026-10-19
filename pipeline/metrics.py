import pandas as pd


def _round2(value: float) -> float:
    """Arrondi à 2 décimales après un léger arrondi intermédiaire (évite 20.695 -> 20.69)."""
    return round(round(float(value), 6), 2)


def compute_metrics(df_valid: pd.DataFrame, df_anomalies: pd.DataFrame) -> dict:
    """
    Calcule les indicateurs du catalogue à partir du DataFrame validé.

    Offres illimitées : identifiées par `data_display` ("Illimité"), exclues de la moyenne de data
    (data_gb est vide pour elles) et comptées à part.
    """
    prices = pd.to_numeric(df_valid["price"], errors="coerce").dropna()
    data_gb = pd.to_numeric(df_valid["data_gb"], errors="coerce")
    unlimited = df_valid["data_display"].astype(str).str.lower().str.contains("illimit|unlimited", regex=True)
    limited_data = data_gb[~unlimited].dropna()

    supplier_counts = df_valid["supplier"].value_counts()  # trié du plus grand au plus petit

    avg_price_by_supplier = (
        df_valid.assign(price=pd.to_numeric(df_valid["price"], errors="coerce"))
        .groupby("supplier")["price"].mean().sort_values()
    )

    return {
        # Indicateurs demandés
        "total_esim": int(len(df_valid)),
        "products_over_100": int((prices > 100).sum()),
        "price_range": {
            "min": _round2(prices.min()) if not prices.empty else 0.0,
            "max": _round2(prices.max()) if not prices.empty else 0.0,
        },
        "avg_data_gb": _round2(limited_data.mean()) if not limited_data.empty else 0.0,
        "unlimited_count": int(unlimited.sum()),
        "pricing": {
            "mean": _round2(prices.mean()) if not prices.empty else 0.0,
            "median": _round2(prices.median()) if not prices.empty else 0.0,
        },
        "supplier_distribution": {str(k): int(v) for k, v in supplier_counts.items()},
        "total_anomalies": int(len(df_anomalies)),
        # Bonus
        "bonus": {
            "avg_price_by_supplier": {str(k): _round2(v) for k, v in avg_price_by_supplier.items()},
            "avg_price_unlimited": _round2(prices[unlimited.reindex(prices.index)].mean()) if unlimited.any() else None,
            "avg_price_limited": _round2(prices[~unlimited.reindex(prices.index)].mean()) if (~unlimited).any() else None,
            "share_5g_pct": _round2((df_valid["network"].astype(str).str.upper() == "5G").mean() * 100),
            "share_top_up_pct": _round2((df_valid["top_up"].astype(str).str.lower() == "oui").mean() * 100),
        },
    }