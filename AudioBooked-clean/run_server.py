import uvicorn

if __name__ == "__main__":
    print("[*] Starting AudioBooked Studio server on http://localhost:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

