"""
Complaint classifier — TF-IDF + SVM pipeline.
Classifies based on title + description combined.
Falls back to rule-based StandaloneMLService if models not found.
"""

import os
import joblib

BASE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "trained_models")

_pipe_cat        = None
_pipe_pri        = None
_le_cat          = None
_le_pri          = None
_model_available = False


def _load_models():
    global _pipe_cat, _pipe_pri, _le_cat, _le_pri, _model_available

    cat_path    = os.path.join(BASE_DIR, "svm_category_model.pkl")
    pri_path    = os.path.join(BASE_DIR, "svm_priority_model.pkl")
    le_cat_path = os.path.join(BASE_DIR, "label_encoder_category.pkl")
    le_pri_path = os.path.join(BASE_DIR, "label_encoder_priority.pkl")

    for p in [cat_path, pri_path, le_cat_path, le_pri_path]:
        if not os.path.exists(p):
            print(f"[WARN] Missing {p} — using rule-based fallback")
            return

    try:
        _pipe_cat = joblib.load(cat_path)
        _pipe_pri = joblib.load(pri_path)
        _le_cat   = joblib.load(le_cat_path)
        _le_pri   = joblib.load(le_pri_path)
        _model_available = True
        print("[OK] TF-IDF + SVM classifier loaded")
    except Exception as e:
        print(f"[WARN] Classifier load error: {e} — using rule-based fallback")


_load_models()


def classify(title: str, description: str = "") -> tuple:
    """
    Returns (category, priority).
    Combines title + description for best accuracy.
    """
    query = f"{title} {description}".strip()

    if _model_available:
        try:
            cat = _le_cat.inverse_transform(_pipe_cat.predict([query]))[0]
            pri = _le_pri.inverse_transform(_pipe_pri.predict([query]))[0]
            return cat, pri
        except Exception as e:
            print(f"[WARN] Inference error: {e} — falling back")

    from trained_models.standalone_ml import ml_service
    return ml_service.classify_user_query(query)


def is_bert_loaded() -> bool:
    return _model_available


def get_labels() -> dict:
    if _model_available:
        return {
            "categories": list(_le_cat.classes_),
            "priorities":  list(_le_pri.classes_),
        }
    return {"categories": [], "priorities": []}
