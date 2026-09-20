from fastapi import FastAPI

from app.drops.routers import router as drops_router

app = FastAPI(title="Zero Drop")

app.include_router(drops_router)
