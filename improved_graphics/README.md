# improved_graphics

Everything needed to apply the graphics upgrade (5 environment + 5 villain + 5 hero changes).

- `GRAPHICS_UPGRADE_PROMPT.md`: the prompt to give to the coding AI.
- `images/`: target screenshots (left = now, right = target) and native 480×270 target frames.
- `videos/`: motion targets.
- `reference_code/prototype.patch`: the working prototype as a `git diff` (apply with `git apply --3way` on the Crab King version, or port by hand).
- `reference_code/new_files/`: the new modules from the patch.
- `tools/`: deterministic capture scripts used to make the images (`pip install playwright`, Chrome).
- `prompt-log-entries.md`: entries for `docs/prompt-log.md` (required by `CLAUDE.md`).

How to use: open the repository in your coding assistant, paste the prompt from the "ROLE" heading down, and keep this folder in the repository so it can read the images and code.
