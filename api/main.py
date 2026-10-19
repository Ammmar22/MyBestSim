from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pipeline.load import load_supplier_csvs
from pipeline.validate import validate_data
from pipeline.metrics import compute_metrics

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

app = FastAPI(
    title="MyBestSim eSIM Dashboard API",
    description="API REST pour l'analyse des offres eSIM et la gestion des anomalies.",
    version="1.0.0",
)

# No cookies are used, so credentials are disabled (required with allow_origins=["*"]).
# Once deployed, you can replace ["*"] with your Vercel URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load and process the data once at startup
raw_df = None
valid_df = None
anomalies_df = None
load_error = None
cached_metrics = None

try:
    raw_df = load_supplier_csvs(str(DATA_DIR))
    valid_df, anomalies_df = validate_data(raw_df)
    cached_metrics = compute_metrics(valid_df, anomalies_df)
except Exception as e:
    load_error = str(e)


@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API MyBestSim eSIM Dashboard"}


@app.get("/health")
def health():
    return {"status": "error" if load_error else "ok", "detail": load_error}


@app.get("/metrics")
def get_metrics():
    """Expose les indicateurs clés du catalogue eSIM."""
    if load_error or cached_metrics is None:
        raise HTTPException(status_code=500, detail=load_error or "Données indisponibles")
    return cached_metrics


@app.get("/anomalies")
def get_anomalies(limit: int = 50):
    """Expose le rapport d'anomalies détectées lors de l'ingestion."""
    if load_error or anomalies_df is None:
        raise HTTPException(status_code=500, detail=load_error or "Données indisponibles")
    subset = anomalies_df.head(limit)
    # NaN is not valid JSON: convert it to None (null)
    clean = subset.astype(object).where(subset.notna(), None)
    return clean.to_dict(orient="records")