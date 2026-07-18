from typing import Dict, Any, List
from langgraph.graph import StateGraph, END
from state import GraphState
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

model = ChatOpenAI(model="gpt-4o-mini", temperature=0.1)

async def architect_node(state: GraphState) -> Dict[str, Any]:
    print("[Agent: System Architect] Invoking LLM...")
    prompt = (
        f"You are a Senior System Architect.\n"
        f"Design a high-level system architecture for the following task:\n"
        f"Task: {state['task']}\n"
        f"Tech Stack: {state['language']} using frameworks: {', '.join(state['frameworks'])}\n\n"
        f"Provide a comprehensive design document describing the architecture layout, components, and data flow."
    )
    messages = [
        SystemMessage(content="You are an expert software system architect with 15+ years experience."),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    return {"architecture_doc": response.content}

async def db_designer_node(state: GraphState) -> Dict[str, Any]:
    print("[Agent: DB Designer] Invoking LLM...")
    prompt = (
        f"You are a Database Schema Designer.\n"
        f"Based on the user task and architecture design below, model a relational database schema.\n"
        f"Task: {state['task']}\n"
        f"Architecture Design:\n{state['architecture_doc']}\n\n"
        f"Provide the tables definitions, column types, primary/foreign keys, and indexes."
    )
    messages = [
        SystemMessage(content="You are an expert database designer."),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    return {"db_schema": response.content}

async def developer_node(state: GraphState) -> Dict[str, Any]:
    print("[Agent: Backend Developer] Invoking LLM...")
    
    revision_context = ""
    if state['revision_count'] > 0 and state.get('review_feedback'):
        revision_context = (
            f"\n\n[ATTENTION] This is revision iteration #{state['revision_count']}. "
            f"The previous build review failed. You must address the following review feedback:\n"
            f"{state['review_feedback']}\n"
        )

    prompt = (
        f"You are a Backend Developer.\n"
        f"Write complete, production-ready code in {state['language']} using frameworks: {', '.join(state['frameworks'])}.\n"
        f"Task: {state['task']}\n"
        f"Architecture Design:\n{state['architecture_doc']}\n"
        f"Database Schema:\n{state['db_schema']}\n"
        f"{revision_context}\n"
        f"Provide clean implementation files and code structure."
    )
    messages = [
        SystemMessage(content="You are an expert backend developer."),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    return {"code": response.content}

async def tester_node(state: GraphState) -> Dict[str, Any]:
    print("[Agent: QA Tester] Invoking LLM...")
    prompt = (
        f"You are a QA Automation Tester.\n"
        f"Write and define test cases to validate the correctness of the following implementation code.\n"
        f"Task: {state['task']}\n"
        f"Implementation Code:\n{state['code']}\n\n"
        f"Provide test cases, coverage details, and mock execution test pass/fail results."
    )
    messages = [
        SystemMessage(content="You are an expert QA tester."),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    return {"test_results": response.content}

async def reviewer_node(state: GraphState) -> Dict[str, Any]:
    print("[Agent: Code Reviewer] Invoking LLM...")
    prompt = (
        f"You are a Principal Code Reviewer.\n"
        f"Assess the design quality, styling, security, and test correctness for the following code.\n"
        f"Task: {state['task']}\n"
        f"Implementation Code:\n{state['code']}\n"
        f"Test Results:\n{state['test_results']}\n\n"
        f"CRITICAL COMPLIANCE REQUIREMENT:\n"
        f"You must end your response with exactly one of these phrases:\n"
        f"- 'Code review: passed' (if ready for production)\n"
        f"- 'Code review: failed' (if changes/fixes are needed)\n\n"
        f"Followed by the detailed audit notes."
    )
    messages = [
        SystemMessage(content="You are a principal engineer conducting a code review."),
        HumanMessage(content=prompt)
    ]
    response = await model.ainvoke(messages)
    
    feedback = response.content
    if "code review: failed" in feedback.lower():
        return {
            "review_feedback": feedback,
            "revision_count": state['revision_count'] + 1,
            "status": "revision_requested"
        }
    else:
        return {
            "review_feedback": feedback,
            "status": "complete"
        }

def should_revise(state: GraphState) -> str:
    feedback = state.get("review_feedback", "")
    rev_count = state.get("revision_count", 0)
    max_revs = state.get("max_revisions", 2)
    
    if "failed" in feedback.lower() and rev_count <= max_revs:
        print(f"[Graph Router] Routing flow back to 'developer' node. Revision count: {rev_count}")
        return "developer"
    
    print("[Graph Router] Routing flow to END. Criteria satisfied.")
    return END

# Initialize and compile the state graph flow
workflow = StateGraph(GraphState)

workflow.add_node("architect", architect_node)
workflow.add_node("db_designer", db_designer_node)
workflow.add_node("developer", developer_node)
workflow.add_node("tester", tester_node)
workflow.add_node("reviewer", reviewer_node)

workflow.set_entry_point("architect")

workflow.add_edge("architect", "db_designer")
workflow.add_edge("db_designer", "developer")
workflow.add_edge("developer", "tester")
workflow.add_edge("tester", "reviewer")

workflow.add_conditional_edges(
    "reviewer",
    should_revise,
    {
        "developer": "developer",
        END: END
    }
)

app_graph = workflow.compile()
