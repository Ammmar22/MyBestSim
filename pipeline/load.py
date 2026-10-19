import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)

EXPECTED_COLUMNS = [
    "sku", "provider", "product_name", "country_code", "country_name",
    "data_gb", "data_display", "validity_days", "price", "currency",
    "network", "top_up",
]
NUMERIC_COLUMNS = ["data_gb", "validity_days", "price"]


def load_supplier_csvs(raw_data_dir: str = "data/raw") -> pd.DataFrame:
    """
    Charge tous les CSV fournisseurs de `raw_data_dir` et retourne un DataFrame consolidé.

    - Tout est lu en texte (dtype=str) puis converti explicitement : on évite ainsi que pandas
      transforme le code pays "NA" (Amérique du Nord) en valeur manquante.
    - `supplier` = nom d'affichage du fournisseur (colonne `provider`, ex. "aloSIM", "Maya Mobile"),
      avec le nom du fichier en secours.
    - Les valeurs non numériques deviennent NaN : c'est validate.py qui décide si c'est une anomalie
      (data_gb vide est normal pour une offre illimitée).
    - Un fichier illisible ou au mauvais schéma n'arrête pas l'import, mais il est consigné
      dans `df.attrs["load_errors"]` et dans les logs.
    """
    csv_files = sorted(Path(raw_data_dir).glob("*.csv"))
    if not csv_files:
        raise FileNotFoundError(f"Aucun fichier CSV trouvé dans le dossier : {raw_data_dir}")

    frames: list[pd.DataFrame] = []
    load_errors: list[str] = []

    for file_path in csv_files:
        try:
            df = pd.read_csv(
                file_path,
                dtype=str,
                keep_default_na=False,   # "NA" reste "NA"
                encoding="utf-8-sig",    # gère un éventuel BOM
                skipinitialspace=True,
            )
        except Exception as exc:  # fichier corrompu, encodage inattendu...
            load_errors.append(f"{file_path.name}: lecture impossible ({exc})")
            continue

        df.columns = df.columns.str.strip()
        missing = [c for c in EXPECTED_COLUMNS if c not in df.columns]
        if missing:
            load_errors.append(f"{file_path.name}: colonnes manquantes {missing}")
            continue

        df = df.apply(lambda col: col.str.strip())
        df["supplier"] = df["provider"].where(df["provider"] != "", file_path.stem)
        df["source_file"] = file_path.name
        frames.append(df)

    for message in load_errors:
        logger.warning(message)

    if not frames:
        raise ValueError(f"Aucun CSV valide n'a pu être chargé : {load_errors}")

    combined = pd.concat(frames, ignore_index=True)

    for col in NUMERIC_COLUMNS:
        combined[col] = pd.to_numeric(combined[col].str.replace(",", ".", regex=False), errors="coerce")

    combined.attrs["load_errors"] = load_errors
    return combined