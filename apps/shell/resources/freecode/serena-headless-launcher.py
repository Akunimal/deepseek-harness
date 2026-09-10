"""Run Serena with a Windows-safe direct language-server launcher.

Serena's SolidLSP currently routes list-form language-server commands through
``shell=True``. On Windows that creates a transient cmd/conhost even when the
child is otherwise hidden. This small product-owned adapter keeps Serena's
MCP entrypoint upstream while replacing only that process boundary with a
direct ``Popen`` call for executable argv lists.
"""

from __future__ import annotations

import os
import subprocess
from typing import Any


def _install_windows_direct_launcher() -> None:
    if os.name != "nt":
        return

    from solidlsp.util import subprocess_util

    original_launch = subprocess_util.ManagedSubprocessLauncher.launch

    def launch(self: Any, process_launch_info: Any, name: str, start_new_session: bool) -> Any:
        command = process_launch_info.cmd
        # Keep upstream's shell path for unusual string commands. Serena's
        # normal dependency providers produce argv lists, including Pyright.
        if not isinstance(command, list) or not command:
            return original_launch(self, process_launch_info, name, start_new_session)

        environment = os.environ.copy()
        environment.update(process_launch_info.env)
        kwargs = subprocess_util.subprocess_kwargs()
        # Keep this explicit in the product-owned boundary as defense in depth
        # if SolidLSP changes its shared Windows subprocess helper upstream.
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        kwargs["start_new_session"] = start_new_session
        process = subprocess.Popen(
            [str(argument) for argument in command],
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=environment,
            cwd=process_launch_info.cwd,
            shell=False,
            **kwargs,
        )
        return subprocess_util.ManagedSubprocess(process, name, start_new_session)

    subprocess_util.ManagedSubprocessLauncher.launch = launch


def main() -> None:
    _install_windows_direct_launcher()
    from serena.cli import top_level

    top_level(prog_name="serena")


if __name__ == "__main__":
    main()
