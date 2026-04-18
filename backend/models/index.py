import json
import numpy as np
import faiss

ATTRIBUTE_KEYS = [
    "price_sensitivity",
    "sound_quality",
    "comfort",
    "battery_life",
    "portability",
    "noise_cancellation",
]


def build_index(products_path):
    with open(products_path) as f:
        products = json.load(f)
    vectors = np.array(
        [[p["attributes"][k] for k in ATTRIBUTE_KEYS] for p in products],
        dtype=np.float32,
    )
    faiss.normalize_L2(vectors)
    index = faiss.IndexFlatIP(len(ATTRIBUTE_KEYS))
    index.add(vectors)
    return index, products


def query_index(index, products, preference_vector, top_k=5):
    pv = np.array([preference_vector], dtype=np.float32)
    faiss.normalize_L2(pv)
    scores, indices = index.search(pv, top_k)
    return [(products[i], float(scores[0][j])) for j, i in enumerate(indices[0])]
