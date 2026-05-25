python -m src.simulate to run the file 
jupyter notebook --notebook-dir="D:\predictive-maintenance-sme"

cd D:\predictive-maintenance-sme
venv\Scripts\activate
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

npm run dev
