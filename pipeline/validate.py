import pandas as pd

REQUIRED_TEXT_FIELDS = ["sku", "supplier", "product_name"]


def _is_unlimited(df: pd.DataFrame) -> pd.Series:
    return df["data_display"].astype(str).str.lower().str.contains("illimit|unlimited", regex=True)


def validate_data(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Valide le DataFrame brut et retourne (df_valide, df_anomalies).

    Règles (appliquées dans l'ordre, une ligne est rejetée pour sa première anomalie) :
    1. Champs texte obligatoires présents (sku, supplier, product_name)
    2. Prix présent et numérique
    3. Prix strictement positif
    4. Devise = EUR
    5. Data (Go) présente, sauf pour les offres illimitées (data_gb vide = normal)
    6. Doublon strict = même SKU déjà vu (deux offres avec le même fournisseur, produit et prix
       mais un SKU, un réseau ou un top-up différent sont des produits distincts).

    Aucune ligne n'est supprimée en silence : chaque rejet est dans df_anomalies avec sa raison.
    """
    for field in ["price", "currency", "data_gb", "data_display", *REQUIRED_TEXT_FIELDS]:
        if field not in df.columns:
            raise ValueError(f"Champ obligatoire manquant dans les données : {field}")

    working = df.copy()
    working["price"] = pd.to_numeric(working["price"], errors="coerce")
    working["data_gb"] = pd.to_numeric(working["data_gb"], errors="coerce")

    rejected: list[pd.DataFrame] = []

    def reject(mask: pd.Series, reason: str) -> None:
        nonlocal working
        if mask.any():
            bad = working[mask].copy()
            bad["anomaly_reason"] = reason
            rejected.append(bad)
            working = working[~mask]

    # 1. Champs texte obligatoires
    empty_text = pd.Series(False, index=working.index)
    for field in REQUIRED_TEXT_FIELDS:
        empty_text |= working[field].isna() | (working[field].astype(str).str.strip() == "")
    reject(empty_text, "Champ obligatoire vide (sku, fournisseur ou nom du produit)")

    # 2. Prix manquant ou non numérique
    reject(working["price"].isna(), "Prix manquant ou non numérique")

    # 3. Prix négatif ou nul
    reject(working["price"] <= 0, "Prix négatif ou nul")

    # 4. Devise
    reject(working["currency"].astype(str).str.strip().str.upper() != "EUR", "Devise non-EUR")

    # 5. Data manquante (hors illimité)
    reject(working["data_gb"].isna() & ~_is_unlimited(working), "Data (Go) manquante ou invalide")

    # 6. Doublon strict = même SKU
    reject(working.duplicated(subset=["sku"], keep="first"), "Doublon strict (SKU déjà présent)")

    if rejected:
        df_anomalies = pd.concat(rejected, ignore_index=True)
    else:
        df_anomalies = pd.DataFrame(columns=list(working.columns) + ["anomaly_reason"])

    return working.reset_index(drop=True), df_anomalies