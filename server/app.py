import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

def main():
    import uvicorn
    from backend.main import app
    uvicorn.run(app, host="0.0.0.0", port=7860)

if __name__ == "__main__":
    main()
