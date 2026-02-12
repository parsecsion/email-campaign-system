import json
import types

import agent.service as agent_service_module
from agent.service import AgentService


class _FakeResponse:
    def __init__(self, message):
        self.choices = [types.SimpleNamespace(message=message)]


class _FakeClient:
    def __init__(self, responses):
        self._responses = list(responses)
        self.chat = types.SimpleNamespace(completions=types.SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        if not self._responses:
            raise RuntimeError("No fake responses left")
        return self._responses.pop(0)


def _tool_call(name, args, call_id="call_1"):
    return types.SimpleNamespace(
        id=call_id,
        function=types.SimpleNamespace(name=name, arguments=json.dumps(args)),
    )


def _assistant_message(content=None, tool_calls=None):
    return types.SimpleNamespace(content=content, tool_calls=tool_calls or [])


def test_sensitive_tool_requires_confirmation_token(monkeypatch):
    service = AgentService()

    first_message = _assistant_message(
        content=None,
        tool_calls=[_tool_call("delete_interview", {"interview_id": 10})],
    )
    monkeypatch.setattr(agent_service_module, "client", _FakeClient([_FakeResponse(first_message)]))

    result = service.process_message(
        message_history=[{"role": "user", "content": "Delete interview 10"}],
        model="test-model",
        user_email="admin@example.com",
    )

    req = result["meta"]["confirmation_request"]
    assert req["tool"] == "delete_interview"
    assert req["confirmation_id"]


def test_sensitive_tool_executes_only_with_matching_confirmation_token(monkeypatch):
    service = AgentService()

    request_message = _assistant_message(
        content=None,
        tool_calls=[_tool_call("delete_interview", {"interview_id": 10})],
    )
    approve_message = _assistant_message(
        content=None,
        tool_calls=[_tool_call("delete_interview", {"interview_id": 10})],
    )
    final_message = _assistant_message(content="Done.", tool_calls=[])

    monkeypatch.setattr(
        agent_service_module,
        "client",
        _FakeClient([
            _FakeResponse(request_message),
            _FakeResponse(approve_message),
            _FakeResponse(final_message),
        ]),
    )

    tool_calls = []

    def fake_delete(interview_id):
        tool_calls.append(interview_id)
        return {"success": True}

    service.available_functions["delete_interview"] = fake_delete

    first = service.process_message(
        message_history=[{"role": "user", "content": "Delete interview 10"}],
        model="test-model",
        user_email="admin@example.com",
    )
    confirmation_id = first["meta"]["confirmation_request"]["confirmation_id"]

    second = service.process_message(
        message_history=[{"role": "user", "content": f"CONFIRMED: {confirmation_id}"}],
        model="test-model",
        user_email="admin@example.com",
    )

    assert tool_calls == [10]
    assert second["content"] == "Done."
    assert service.pending_confirmations == {}


def test_wrong_confirmation_token_does_not_execute_sensitive_tool(monkeypatch):
    service = AgentService()

    first_message = _assistant_message(
        content=None,
        tool_calls=[_tool_call("delete_interview", {"interview_id": 10})],
    )
    retry_message = _assistant_message(
        content=None,
        tool_calls=[_tool_call("delete_interview", {"interview_id": 10})],
    )

    monkeypatch.setattr(
        agent_service_module,
        "client",
        _FakeClient([
            _FakeResponse(first_message),
            _FakeResponse(retry_message),
        ]),
    )

    first = service.process_message(
        message_history=[{"role": "user", "content": "Delete interview 10"}],
        model="test-model",
        user_email="admin@example.com",
    )
    original_token = first["meta"]["confirmation_request"]["confirmation_id"]

    second = service.process_message(
        message_history=[{"role": "user", "content": "CONFIRMED: bad-token"}],
        model="test-model",
        user_email="admin@example.com",
    )

    second_token = second["meta"]["confirmation_request"]["confirmation_id"]
    assert second_token
    assert second_token != original_token
