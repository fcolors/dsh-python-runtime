---
name: python-runtime
description: Use whenever Python, pip, Python scripts, or Python-based tools are needed. Always use the DSH Python environment discovered by this skill and the dsh-python-runtime plugin, preferring the uv mode.
---

# Python Runtime

The `dsh-python-runtime` plugin exposes managed `DSH_*` facts in every shell call:

- `DSH_PYTHON_ENV` — absolute path of the DSH Python environment root (absent when undiscovered).
- `DSH_PYTHON` — absolute path of the interpreter inside `DSH_PYTHON_ENV`.
- `DSH_UV` — absolute path of `uv` when found on PATH; when present, prefer uv mode.

When using Python, always use the environment identified by `DSH_PYTHON_ENV` / `DSH_PYTHON`:

- Windows: `%DSH_PYTHON_ENV%\Scripts\python.exe`
- POSIX: `$DSH_PYTHON_ENV/bin/python`

Do not use system `python`, `python3`, or `pip` when `DSH_PYTHON_ENV` is available.

## Prefer uv mode

When `DSH_UV` (or `uv` on PATH) is available, prefer uv for package work:

- Packages: `uv pip install --python "%DSH_PYTHON_ENV%\Scripts\python.exe" <packages>`
- Scripts: `"%DSH_PYTHON_ENV%\Scripts\python.exe" <script.py>` (or `uv run --python` when a uv-managed interpreter is already resolved)

## When DSH_PYTHON_ENV is absent

The plugin resolves it in this strict order: the environment fact, then the `DSH_PYTHON_ENV` line in `$DSH_HOME/.env` (config fallback). If both miss, report that the DSH Python environment is unavailable and stop — never silently use another Python installation.

## Sanitization

- Never dump the full environment (`Get-ChildItem env:` / `env`) — it may carry credentials. Query only the named `DSH_*` variable.
- When inspecting config files, echo only the matched `DSH_PYTHON_ENV` line; never paste other lines, secrets, or credential files into the conversation.
- Report paths symbolically where possible (for example `$DSH_HOME\...`); do not restate absolute machine paths beyond the resolved interpreter itself.
