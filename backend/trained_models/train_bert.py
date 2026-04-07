"""
Train complaint classifiers using TF-IDF + SVM (no torch/transformers needed).
Fast, accurate, works on any Python setup.

Run from Capstone_BE/:
    python trained_models/train_bert.py
"""

import sys
import os
sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd
import joblib
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.svm import SVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

BASE_DIR  = os.path.dirname(os.path.abspath(__file__))
CSV_PATH  = os.path.join(BASE_DIR, "cmsdata.csv")
LE_CAT    = os.path.join(BASE_DIR, "label_encoder_category.pkl")
LE_PRI    = os.path.join(BASE_DIR, "label_encoder_priority.pkl")
CAT_MODEL = os.path.join(BASE_DIR, "svm_category_model.pkl")
PRI_MODEL = os.path.join(BASE_DIR, "svm_priority_model.pkl")
# flag file so bert_classifier knows which engine to use
ENGINE    = os.path.join(BASE_DIR, "classifier_engine.txt")

# ── load & clean ──────────────────────────────────────────────────────────────
print("Loading dataset...")
df = pd.read_csv(CSV_PATH)
df.columns = df.columns.str.strip()

# drop header-as-data row if present
df = df[df["Category"] != "Category"].reset_index(drop=True)
df.dropna(subset=["User Query", "Category", "Priority"], inplace=True)

print(f"  {len(df)} samples loaded")
print(f"  Categories : {sorted(df['Category'].unique())}")
print(f"  Priorities : {sorted(df['Priority'].unique())}")

# ── encode labels ─────────────────────────────────────────────────────────────
le_cat = LabelEncoder()
le_pri = LabelEncoder()
y_cat = le_cat.fit_transform(df["Category"])
y_pri = le_pri.fit_transform(df["Priority"])
joblib.dump(le_cat, LE_CAT)
joblib.dump(le_pri, LE_PRI)
print(f"\n[OK] Label encoders saved")
print(f"  Categories : {list(le_cat.classes_)}")
print(f"  Priorities : {list(le_pri.classes_)}")

# ── split ─────────────────────────────────────────────────────────────────────
X = df["User Query"].tolist()
X_train, X_val, y_cat_train, y_cat_val, y_pri_train, y_pri_val = train_test_split(
    X, y_cat, y_pri, test_size=0.2, random_state=42, stratify=y_cat
)
print(f"\n  Train: {len(X_train)}  |  Val: {len(X_val)}")

# ── TF-IDF + SVM pipeline ─────────────────────────────────────────────────────
def make_pipeline():
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=10000,
            sublinear_tf=True,
            analyzer="word",
            min_df=1
        )),
        ("svm", SVC(kernel="rbf", C=10, gamma="scale", probability=True))
    ])

print("\n[START] Training Category classifier...")
pipe_cat = make_pipeline()
pipe_cat.fit(X_train, y_cat_train)
joblib.dump(pipe_cat, CAT_MODEL)
print(f"[OK] Category model saved -> {CAT_MODEL}")

print("\n[START] Training Priority classifier...")
pipe_pri = make_pipeline()
pipe_pri.fit(X_train, y_pri_train)
joblib.dump(pipe_pri, PRI_MODEL)
print(f"[OK] Priority model saved -> {PRI_MODEL}")

# mark engine type
with open(ENGINE, "w") as f:
    f.write("tfidf_svm")

# ── evaluation ────────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("CLASSIFICATION REPORT")
print("="*55)

cat_preds = pipe_cat.predict(X_val)
pri_preds = pipe_pri.predict(X_val)

cat_acc = accuracy_score(y_cat_val, cat_preds)
pri_acc = accuracy_score(y_pri_val, pri_preds)

print(f"\nCategory Model - Validation Accuracy: {cat_acc*100:.2f}%")
print(classification_report(
    y_cat_val, cat_preds,
    target_names=list(le_cat.classes_),
    zero_division=0
))

print(f"\nPriority Model - Validation Accuracy: {pri_acc*100:.2f}%")
print(classification_report(
    y_pri_val, pri_preds,
    target_names=list(le_pri.classes_),
    zero_division=0
))

print("\n[DONE] Training complete. Restart server.py to activate the new classifier.")
