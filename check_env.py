import sys
import os
import glob

print(f"Python: {sys.version}")
try:
    import pandas as pd
    print(f"Pandas: {pd.__version__}")
except ImportError as e:
    print(f"Pandas not installed: {e}")

try:
    import openpyxl
    print("OpenPyXL installed")
except ImportError as e:
    print(f"OpenPyXL not installed: {e}")

files = glob.glob("KUBWA_TABLE VIEW/*.xlsx")
print(f"Found {len(files)} files")
if files and 'pd' in locals():
    try:
        df = pd.read_excel(files[0])
        print(f"Sample file: {files[0]}")
        print("Columns:", df.columns.tolist())
        print("Shape:", df.shape)
        print("Head:\n", df.head(2))
    except Exception as ex:
        print("Read error:", ex)
