import pandas as pd
import pytest
from pipeline.metrics import compute_metrics

def test_compute_metrics():
    valid_data = {
        'product_name': ['Pass A', 'Pass B', 'Pass C'],
        'price': [10.0, 50.0, 150.0],
        'data_gb': [1.0, 10.0, None],
        'data_display': ['1 Go', '10 Go', 'Illimité'],
        'supplier': ['airalo', 'airalo', 'saily']
    }
    df_valid = pd.DataFrame(valid_data)
    df_anomalies = pd.DataFrame({'product_name': ['Bad']})
    
    metrics = compute_metrics(df_valid, df_anomalies)
    
    assert metrics['total_esim'] == 3
    assert metrics['products_over_100'] == 1
    assert metrics['price_range']['min'] == 10.0
    assert metrics['price_range']['max'] == 150.0
    assert metrics['pricing']['mean'] == 70.0
    assert metrics['supplier_distribution']['airalo'] == 2
    assert metrics['supplier_distribution']['saily'] == 1
    assert metrics['unlimited_count'] == 1
    assert metrics['total_anomalies'] == 1