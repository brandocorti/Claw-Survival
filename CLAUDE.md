# CLAUDE.md — GenAI Video Game Project

Context file for Claude (and for the team). Read it fully before doing anything in this repository.

## 1. What this project is

Practical project for the **Generative AI and Language Models** course (UPM, ETS Ingenieros Informáticos, Departamento de Inteligencia Artificial), academic year 2026/27, progressive (continuous) evaluation. It is run as **challenge-based learning (CBL)**: team work sessions, then a final presentation day with peer evaluation.

**The challenge:** design and develop a **video game using generative AI tools**. The game can combine text generation, code, images, music, video and dynamic dialogues (multimodal GenAI). There is no predefined solution or style.

Examples given in the assignment (only inspiration, not requirements):

- A self-contained space invaders game in a single HTML5 file, built through the web interface of a GenAI system.
- A conversational adventure in Python using GenAI application frameworks such as LangChain.

## 2. Hard rules (do not break)

- **The work must be original to this course.** It is strictly forbidden to submit work that has been used, or is intended to be used, in any other course or academic program. Never reuse code or assets from other courses.
- **Team:** ten members
- **Presentation:** all teams present on the **last day**, **maximum 15 minutes** each, followed by 5 minutes of peer evaluation. Not every member has to present, but every member must attend.
- **Submission:** before the first presentation, **only one team member** uploads **one PDF** to Moodle, in free format. It should contain: team member names, code links, task distribution, instructions for loading/running the code, and prompt examples.
- **Language** documentation needs to be in English

## 3. How we are graded

Grading is split between **peer evaluation** (the other teams) and **the professors**. Every student also fills in the peer rubric for the other teams, and leaving questions blank is penalised.

Each criterion is scored 1–10:

| Criterion | What they look at |
|---|---|
| Quality and variety of prompts | Clear, well-structured, diverse prompts with the elements needed to get results aligned with the challenge |
| Iterative prompt design process | Were the iterations documented and were the changes justified? |
| Quality of final result | How well the challenge is solved; how functional and coherent the prototype/demo is |
| Creativity and innovation | Originality in the approach, in the prompt design, or in how model limitations were handled |
| Clarity and structure of the presentation | Well organised; communicates both the process and the results |
| Task division and integration | Real collaboration, fair task distribution, coherent integration of contributions |

Open questions asked to the evaluators: what was the strongest aspect and why; what would you improve.

**Consequence for how we work:** the rubric rewards the *prompting process* at least as much as the game. Four of the six criteria are about prompts, iteration, creativity and the story we tell. A modest game with a well-documented, justified prompt history beats a flashy game with no trace of how it was made. Every working session must leave evidence behind (see section 5).

## 4. Project decisions (team to fill in; Claude: ask if these are empty)

- Game concept and genre: **TBD**
- Tech stack: **TBD**. Default proposal if the team has no preference: a single self-contained HTML5/JavaScript file (no build step, runs by double-click, easy to demo and to include in the PDF); Python plus LangChain only if the concept needs LLM-driven dialogue at runtime.
- GenAI tools used per modality (code, text/dialogue, images, music, video): **TBD**
- Team members and roles: **TBD**
- Presentation date and room: **TBD**
- Moodle group and PDF owner: **TBD**

## 5. Prompt log (the most important artefact)

Keep a running log in `docs/prompt-log.md`. One entry per meaningful prompt or iteration:

```
### [Module] Short title — YYYY-MM-DD — author
- Goal: what we wanted
- Tool/model: which system and version
- Prompt: the exact text (or a link to a file in prompts/)
- Result: what came out; link/screenshot if useful
- Problem found: what was wrong or missing
- Change made and why: how the next prompt differs and what justifies the change
```

Rules for Claude when working on this repo:

- When you help write or refine a prompt, **append the entry to the log** or tell the user exactly what to add. Never present a prompt as the first attempt if it is the third.
- Keep failed attempts. They are evidence of the iterative process.
- Keep prompts structured (role, context, task, constraints, output format, examples) and **varied** (different techniques: few-shot, chain-of-thought, step-by-step decomposition, self-review, tool use) because variety is graded.
- Note limitations of the models we hit (hallucinated APIs, inconsistent style, context loss) and how we worked around them: this feeds the creativity criterion.
- It's important to see the evolution of the application from the first iteration to the final product. 
- Generative AI needs to be used during the evolution of the product and catalogged in the logs.

### Changelog (big commits and new features)

Besides the prompt log, keep `docs/changelog.md`: the history of the **product**, while the prompt log is the history of the **prompts**. One entry per substantial change, newest first:

```
### YYYY-MM-DD — Short title — author — commit <short hash>
- Type: feature | refactor | fix | assets | docs
- What changed: one or two sentences, user-visible effect first
- Modules/files touched: e.g. src/dialogue/, assets/music/
- Why: the reason or the problem it solves
- Prompt log: link to the related entry in docs/prompt-log.md (if generated with AI)
```

Rules for Claude:

- **Every substantial change must be written to `docs/changelog.md`** in the same working session, and ideally in the same commit. Substantial means: a new feature or mechanic, a new module, a significant refactor, a change to the game's behaviour or rules, new generated assets, a change of tech stack or dependencies, or any commit a teammate would need to know about. Typos, formatting and trivial fixes do not need an entry.
- Do not wait to be asked. If you finish a substantial change and the entry is missing, add it or tell the user exactly what to add.
- Never rewrite or delete old entries; if something is reverted, add a new entry saying so and why.
- Cross-link: each changelog entry that came from an AI-generated result points to its prompt-log entry, and vice versa. This is what shows the evolution of the application from the first iteration to the final product.
- Fill in the commit hash after committing, so entries can be traced to a person and a point in git history.

## 6. Repository layout (proposed)

```
/
├── CLAUDE.md
├── README.md            # how to run the game (also goes into the PDF)
├── src/                 # game code
├── assets/              # images, audio, text; note the tool that generated each
├── prompts/             # reusable prompt files
├── docs/
│   ├── prompt-log.md    # section 5
│   ├── changelog.md     # section 5: big commits and new features
│   ├── tasks.md         # who does what (feeds "task division")
│   └── presentation.md  # 15-minute outline
└── submission/          # the Moodle PDF source
```

## 7. Working conventions

- **Parallel work:** split the game into independent modules (for example game loop, level/content, dialogue or narrative, art assets, audio, UI) so members can work at the same time, as recommended. Define the interfaces between modules early so that integration is cheap.
- **Collaboration:** use shared tools (Google Colab or Google Drive, or a shared git repository). Commit small and often with clear messages. Each commit or log entry should be attributable to a person: it supports the task-division criterion.
- **Assets:** record the generator, the prompt and the licence or terms of use for every generated asset. Prefer assets we can legally redistribute.
- **Always have a runnable build.** At any moment there should be a version that runs, because a working demo is the main evidence of "quality of final result".
- **Secrets:** never commit API keys. Use environment variables or a `.env` file listed in `.gitignore`.
- **Language:** code, comments and docs in English, as the course and the evaluation form are in English.
- **Do not over-engineer.** The goal is a functional, coherent, creative prototype plus a clear story of how it was made, not a commercial product.

## 8. Presentation plan (15 minutes)

1. The idea and the game (2 min)
2. Live demo or recording (4 min)
3. The prompt process: two or three prompts that evolved, showing iterations and the justification for each change (5 min)
4. Limitations met and how we handled them; what we would improve (2 min)
5. Team organisation and integration (1 min)
6. Buffer (1 min)

Prepare a recorded fallback of the demo in case live execution fails.

## 9. Checklist before the submission PDF

- [ ] Team member names
- [ ] Links to the code (repository or Drive) with access enabled for the professors
- [ ] Task distribution per member
- [ ] Instructions to load and run the code
- [ ] Prompt examples, including at least one iterated sequence with justifications
- [ ] `docs/changelog.md` up to date, cross-linked with the prompt log
- [ ] Confirmation that no part of the work is shared with another course
- [ ] Only one member uploads the PDF to Moodle, before the first presentation
- [ ] Everyone has access to the Microsoft Forms peer evaluation (UPM email account) before the session

---

## 10. Game studio framework (Claude Code Game Studios)

Everything below this line comes from the [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
framework (v1.3.0, MIT, see `licenses/`). It configures the Claude Code agents, skills and hooks
in `.claude/`. The team rules above take precedence where the two disagree.

## Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

### Technology Stack

- **Engine**: Web (Vite 6.3.5; Phaser 3.90.0)
- **Language**: JavaScript (ES modules)
- **Version Control**: Git with trunk-based development
- **Build System**: Vite — `npm run build` (tests: `npm test`, both: `npm run smoke`)
- **Asset Pipeline**: placeholder pixel art generated in code (`src/client/art/`) until real assets exist

> **Note**: Engine-specialist agents exist for Godot, Unity, and Unreal with
> dedicated sub-specialists. Use the set matching your engine.

### Project Structure

@.claude/docs/directory-structure.md

### Engine Version Reference

<!-- ENGINE-REFERENCE-IMPORT: the line under this comment is engine-specific,
     and there is none until an engine is set. /setup-engine, the grow's record
     step and /project-settings (engine.name) write
     @docs/engine-reference/<engine>/VERSION.md here for the chosen engine. Skills
     that need the pinned version read that file on demand either way. -->


### Technical Preferences

`project.yaml` at the repo root is the primary config store — engine, specialists,
naming, platform, performance, modes. Skills resolve it via `resolve_config`
(see `.claude/docs/config-resolution.md`).

`.claude/docs/technical-preferences.md` is the **legacy fallback**, read on demand
when a key is absent from `project.yaml`. It is not imported here: before
`/setup-engine` runs it is almost entirely `[TO BE CONFIGURED]` placeholders, and
after it runs `project.yaml` holds the real values.

### Coordination Rules

@.claude/docs/coordination-rules.md

### Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
  (exempt: `active.md` appends, agent memory, a subagent's new file at the path
  its orchestrating skill named; see `.claude/rules/agent-memory.md`)
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction
- A skipped or dismissed question is not an answer: act on nothing, re-ask in
  plain text and wait
- Started outside this file's folder? Warn first: hooks, deny rules and the
  ask-first mode load only when Claude Code starts here

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** Say "make me a game" (`/prototype`), or run `/start` to begin
> the guided onboarding flow.

### Coding Standards

@.claude/docs/coding-standards.md

### Context Management

Read `.claude/docs/context-management.md` on demand — it is a reference, not
session context. Two of its conventions are load-bearing and cited by name
elsewhere in the repo, so they are restated here rather than lost:

- **`production/session-state/active.md` is the session checkpoint.** The file is
  the memory, not the conversation. Read it first after any compaction, crash, or
  `/clear`.
- **Helpers in `.claude/scripts/` emit observations, never verdicts.** A script
  that scores or judges will eventually contradict a mode or override it cannot
  see. (Cited by `artifact-check.sh` and `adr-dep-graph.sh`.)
