from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from graph import app_graph
import json
import uvicorn
from dotenv import load_dotenv
load_dotenv()
app = FastAPI(title="AI Agent Graph Engine API")

class RunGraphPayload(BaseModel):
    task: str
    language: str = "Python"
    frameworks: List[str] = Field(default_factory=list)
    max_revisions: Optional[int] = 2

async def event_generator(payload: RunGraphPayload):
    initial_state = {
        "task": payload.task,
        "language": payload.language,
        "frameworks": payload.frameworks,
        "architecture_doc": "",
        "db_schema": "",
        "code": "",
        "test_results": "",
        "review_feedback": "",
        "revision_count": 0,
        "max_revisions": payload.max_revisions,
        "status": "executing"
    }
    
    try:
        # Stream the graph execution node updates
        async for event in app_graph.astream(initial_state):
            # Event format is typically: { 'node_name': { 'state_field': 'value' } }
            yield f"data: {json.dumps(event)}\n\n"
        
        # Stream END event signal
        yield "data: {\"event\": \"complete\"}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/run-graph")
async def run_graph(payload: RunGraphPayload):
    try:
        return StreamingResponse(event_generator(payload), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
