import pandas as pd
import pytest

from pipeline.load import load_supplier_csvs
from pipeline.metrics import compute_metrics
from pipeline.validate import validate_data


def make_df(rows):
    base = dict(sku="a-1", supplier="A", product_name="eSIM FR 1 Go 7 jours", country_code="FR",
                data_gb=1.0, data_display="1 Go", validity_days=7, price=10.0, currency="EUR",
                network="4G", top_up="oui")
    return pd.DataFrame([{**base, **r} for r in rows])


def test_same_provider_name_price_but_different_sku_is_not_a_duplicate():
    df = make_df([{"sku": "a-1", "network": "4G"}, {"sku": "a-2", "network": "5G"}])
    valid, anomalies = validate_data(df)
    assert len(valid) == 2 and anomalies.empty


def test_same_sku_is_a_duplicate():
    valid, anomalies = validate_data(make_df([{"sku": "a-1"}, {"sku": "a-1"}]))
    assert len(valid) == 1 and len(anomalies) == 1


def test_unlimited_with_empty_data_is_valid_but_limited_without_data_is_not():
    df = make_df([
        {"sku": "u", "data_gb": None, "data_display": "Illimité"},
        {"sku": "x", "data_gb": None, "data_display": "5 Go"},
    ])
    valid, anomalies = validate_data(df)
    assert list(valid["sku"]) == ["u"] and list(anomalies["sku"]) == ["x"]


def test_negative_missing_and_foreign_currency_are_rejected():
    df = make_df([{"sku": "n", "price": -1}, {"sku": "m", "price": None}, {"sku": "c", "currency": "USD"}])
    valid, anomalies = validate_data(df)
    assert valid.empty and len(anomalies) == 3


def test_metrics_small_dataset():
    df = make_df([
        {"sku": "1", "price": 10, "data_gb": 2.0, "data_display": "2 Go"},
        {"sku": "2", "price": 120, "data_gb": None, "data_display": "Illimité", "supplier": "B"},
        {"sku": "3", "price": 20, "data_gb": 4.0, "data_display": "4 Go"},
    ])
    m = compute_metrics(df, pd.DataFrame())
    assert m["total_esim"] == 3 and m["products_over_100"] == 1
    assert m["avg_data_gb"] == 3.0 and m["unlimited_count"] == 1
    assert m["price_range"] == {"min": 10.0, "max": 120.0}
    assert m["supplier_distribution"] == {"A": 2, "B": 1}


def test_reference_values_on_real_data():
    df = load_supplier_csvs("data/raw")
    valid, anomalies = validate_data(df)
    m = compute_metrics(valid, anomalies)
    assert m["total_esim"] == 5056 and m["total_anomalies"] == 0
    assert m["products_over_100"] == 56
    assert m["price_range"] == {"min": 5.36, "max": 154.63}
    assert m["avg_data_gb"] == 14.49 and m["unlimited_count"] == 653
    assert m["pricing"]["mean"] == 29.30 and m["pricing"]["median"] == 20.70
    assert m["supplier_distribution"]["Airalo"] == 722 and m["supplier_distribution"]["Yatelo"] == 162
    assert "aloSIM" in m["supplier_distribution"] and "Maya Mobile" in m["supplier_distribution"]
    assert (valid["country_code"] == "NA").sum() == 192  # "NA" non transformé en NaN