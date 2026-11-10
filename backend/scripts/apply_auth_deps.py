"""Aplica dependencias de autorización en routes.py (uso único de mantenimiento)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "modules"

SCIENTIFIC = {"articles", "book", "encounter", "monographs", "norm", "patent", "prizes", "software", "theses"}
GROUP_PROJECT = {"group", "project"}
INTEGRANT = {"integrant"}
ZENODO = {"zenodo"}
SKIP = {"auth"}
AUTHENTICATED_ONLY = {"traces"}  # POST de trazas: cualquier usuario autenticado


def ensure_import(content: str, imports: list[str]) -> str:
    line = f"from modules.auth.dependencies import {', '.join(imports)}\n"
    if "modules.auth.dependencies" in content:
        return re.sub(r"from modules\.auth\.dependencies import .*\n", line, content)
    m = re.search(r"(from fastapi import [^\n]+\n)", content)
    if m:
        return content[: m.end()] + line + content[m.end() :]
    return line + content


def add_router_auth(content: str, dep: str = "require_authenticated") -> str:
    marker = f"dependencies=[Depends({dep})]"
    if marker in content:
        return content

    def repl(match: re.Match) -> str:
        block = match.group(0)
        if block.rstrip().endswith(")"):
            return block[:-1] + f"    {marker},\n)"
        return block

    return re.sub(
        r"router = APIRouter\(\n(?:    [^\n]+\n)*?\)",
        repl,
        content,
        count=1,
    )


def add_method_deps(content: str, method: str, dep: str) -> str:
    pattern = rf"@router\.{method}\(([^)]*)\)\ndef "

    def repl(match: re.Match) -> str:
        args = match.group(1)
        token = f"Depends({dep})"
        if token in args:
            return match.group(0)
        if "dependencies=" in args:
            args = re.sub(
                r"dependencies=\[([^\]]*)\]",
                lambda m: f"dependencies=[{m.group(1)}, Depends({dep})]",
                args,
            )
        else:
            prefix = f"{args}, " if args.strip() else ""
            args = f"{prefix}dependencies=[Depends({dep})]"
        return f"@router.{method}({args})\ndef "

    return re.sub(pattern, repl, content)


def add_count_deps(content: str) -> str:
    pattern = r'@router\.get\("/count[^"]*"[^)]*\)'

    def repl(match: re.Match) -> str:
        s = match.group(0)
        if "require_stats_view" in s:
            return s
        if "dependencies=" in s:
            return re.sub(
                r"dependencies=\[([^\]]*)\]",
                r"dependencies=[\1, Depends(require_stats_view)]",
                s,
            )
        return s[:-1] + ", dependencies=[Depends(require_stats_view)]" + s[-1]

    return re.sub(pattern, repl, content)


def patch_file(path: Path) -> bool:
    mod = path.parts[path.parts.index("modules") + 1]
    if mod in SKIP:
        return False

    text = path.read_text(encoding="utf-8")
    original = text

    if mod in AUTHENTICATED_ONLY:
        text = ensure_import(text, ["require_authenticated"])
        text = add_router_auth(text)
    elif mod in ZENODO:
        text = ensure_import(text, ["require_zenodo_access"])
        text = add_router_auth(text, "require_zenodo_access")
    elif mod in INTEGRANT:
        text = ensure_import(text, ["require_authenticated", "require_integrant_write"])
        text = add_router_auth(text)
        for method in ("post", "put", "delete"):
            text = add_method_deps(text, method, "require_integrant_write")
    elif mod in GROUP_PROJECT:
        text = ensure_import(
            text,
            ["require_authenticated", "require_group_project_write", "require_stats_view"],
        )
        text = add_router_auth(text)
        for method in ("post", "put", "delete"):
            text = add_method_deps(text, method, "require_group_project_write")
        text = add_count_deps(text)
    elif mod in SCIENTIFIC:
        text = ensure_import(
            text,
            ["require_authenticated", "require_scientific_write", "require_stats_view"],
        )
        text = add_router_auth(text)
        for method in ("post", "put", "delete"):
            text = add_method_deps(text, method, "require_scientific_write")
        text = add_count_deps(text)
    else:
        text = ensure_import(text, ["require_authenticated", "require_admin"])
        text = add_router_auth(text)
        for method in ("post", "put", "delete"):
            text = add_method_deps(text, method, "require_admin")

    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    updated = []
    for path in sorted(ROOT.glob("**/routes.py")):
        if patch_file(path):
            updated.append(str(path))
    print("Updated", len(updated), "files")
    for p in updated:
        print(" ", p)


if __name__ == "__main__":
    main()
