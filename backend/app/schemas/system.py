from pydantic import BaseModel


class ReadinessResponse(BaseModel):
    status: str
    database: str
    redis: str
    storage: str
