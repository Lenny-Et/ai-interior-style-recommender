from fastapi import FastAPI, UploadFile, File, HTTPException
import numpy as np
import clip
import torch
from PIL import Image
import io
import faiss

app = FastAPI(title="AI Interior Style FastAPI Microservice")

# Load CLIP model
device = "cuda" if torch.cuda.is_available() else "cpu"
try:
    model, preprocess = clip.load("ViT-B/32", device=device)
except Exception as e:
    # Fallback/mock if clip cannot be loaded in env
    model, preprocess = None, None

# Initialize FAISS Index
dimension = 512
# using L2 distance
index = faiss.IndexFlatL2(dimension)

@app.post("/extract-features")
async def extract_features(file: UploadFile = File(...)):
    if not model or not preprocess:
        return {"features": np.random.rand(dimension).tolist(), "status": "mock"}

    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content))
        image_input = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            image_features = model.encode_image(image_input)
            
        return {"features": image_features.cpu().numpy().tolist()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/search")
async def search_similar(features: list[float]):
    if not features or len(features) != dimension:
        raise HTTPException(status_code=400, detail="Invalid feature dimensions")
    
    query = np.array([features], dtype='float32')
    # Example search
    D, I = index.search(query, k=5)
    
    return {"distances": D.tolist(), "indices": I.tolist()}

@app.post("/add-to-index")
async def add_to_index(features: list[float]):
    if not features or len(features) != dimension:
        raise HTTPException(status_code=400, detail="Invalid feature dimensions")
    
    vec = np.array([features], dtype='float32')
    index.add(vec)
    return {"status": "success", "total_vectors": index.ntotal}
