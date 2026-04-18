import pytest


@pytest.fixture
def TEST_PRODUCT():
    return {
        "id": "test-001",
        "name": "Test Headphone XM5",
        "price": 299,
        "specs": {
            "noise_cancellation": 9.5,
            "sound_quality": 9.2,
            "battery_hours": 30,
            "weight_grams": 250,
            "driver_size_mm": 30
        },
        "review_data": {
            "aggregate_score": 4.6,
            "sentiment_score": 0.71,
            "review_count": 18420,
            "source_distribution": {"amazon": 0.62, "rtings": 0.21, "reddit": 0.17},
            "top_complaints": ["ear cup pressure after 2h", "touch controls oversensitive"],
            "top_praises": ["best ANC available", "excellent call quality", "long battery"]
        },
        "affiliate_link_density": 0.34,
        "attributes": {
            "price_sensitivity": 0.4,
            "sound_quality": 0.92,
            "comfort": 0.61,
            "battery_life": 0.90,
            "portability": 0.72,
            "noise_cancellation": 0.95
        }
    }
