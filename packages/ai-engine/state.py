from typing import TypedDict, List

class GraphState(TypedDict):
    task: str
    language: str
    frameworks: List[str]
    architecture_doc: str
    db_schema: str
    code: str
    test_results: str
    review_feedback: str
    revision_count: int
    max_revisions: int
    status: str
