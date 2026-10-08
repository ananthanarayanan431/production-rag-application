
from agent.state import SupportBotState, append_list


def test_append_list_reducer():
    assert append_list(["a", "b"], ["c"]) == ["a", "b", "c"]


def test_append_list_handles_none():
    assert append_list(None, ["c"]) == ["c"]
    assert append_list(["a"], None) == ["a"]


def test_state_has_all_required_fields():
    required_fields = [
        "raw_query", "session_id", "request_id",
        "scrubbed_query", "pii_found", "is_attack", "attack_confidence",
        "intent", "sub_queries", "complexity", "needs_decomp",
        "prompt_version", "current_subquery",
        "session_history", "retrieved_context",
        "sub_responses", "raw_response", "model_used",
        "faithfulness_score", "completeness_score", "validation_passed",
        "final_response",
    ]
    annotations = SupportBotState.__annotations__
    for field in required_fields:
        assert field in annotations, f"Missing field: {field}"


def test_append_list_empty_list_resets():
    assert append_list(["old"], []) == []


async def test_sub_responses_do_not_leak_across_turns_in_same_session():
    from langgraph.checkpoint.memory import InMemorySaver
    from langgraph.graph import END, START, StateGraph
    from langgraph.types import Send

    async def sub(state):
        return {"sub_responses": [state["current_subquery"]]}

    async def merge(state):
        return {"raw_response": "|".join(state["sub_responses"])}

    g = StateGraph(SupportBotState)
    g.add_node("generate_subquery", sub)
    g.add_node("merge_subqueries", merge)
    g.add_conditional_edges(
        START, lambda s: [Send("generate_subquery", {**s, "current_subquery": q}) for q in s["sub_queries"]]
    )
    g.add_edge("generate_subquery", "merge_subqueries")
    g.add_edge("merge_subqueries", END)
    app = g.compile(checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "same-session"}}

    first = await app.ainvoke({"sub_queries": ["a", "b"], "sub_responses": []}, config=config)
    second = await app.ainvoke({"sub_queries": ["c", "d"], "sub_responses": []}, config=config)

    assert sorted(first["raw_response"].split("|")) == ["a", "b"]
    assert sorted(second["raw_response"].split("|")) == ["c", "d"]


def test_append_history_appends_and_caps_length():
    from agent.state import append_history
    from config.setting import get_settings

    cap = get_settings().MAX_SESSION_TURNS * 2
    msgs = [{"role": "user", "content": str(i)} for i in range(cap + 4)]
    result = append_history(msgs[:cap], msgs[cap:])
    assert len(result) == cap
    assert result[-1] == msgs[-1]
    assert result[0] == msgs[4]


def test_append_history_handles_none():
    from agent.state import append_history

    assert append_history(None, [{"role": "user", "content": "a"}]) == [{"role": "user", "content": "a"}]
    assert append_history([{"role": "user", "content": "a"}], None) == [{"role": "user", "content": "a"}]
