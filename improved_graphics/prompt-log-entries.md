# Prompt-log entries for the graphics review (paste into `docs/prompt-log.md`)

These record the three iterations that produced `GRAPHICS_UPGRADE_PROMPT.md`, in the format from `CLAUDE.md`. Replace `author` with the team member's name.

### [Art] Graphics review of the environment — 2026-11-25 — author
- Goal: score the current graphics against Enter the Gungeon and get 5 concrete, rated ways to improve them, shown with screenshots and a video before writing any implementation prompt.
- Tool/model: Claude (Opus 5.5), claude.ai with access to the repository folder.
- Prompt: "Role: act as an expert in improving the graphics of rogue games like Enter the Gungeon. Task: review the graphics of the game as they are right now; give them a mark from 1 to 10; think about 5 ways to improve the graphics; rate the different ways from 1 to 10 and the impact they would create; give me the proposed modifications with screenshots and a short video of how they would look; wait for my OK, after, create a detailed prompt for me to give to another AI and make the modifications. Context: I want to create a professional videogame to win a competition like G4C Student Challenge."
- Result: score 5/10. Five upgrades: terrain and shorelines (9), set dressing (8), light and atmosphere (8), combat feedback and debris (8), character animation and HUD (6). The model built a working prototype behind URL flags and recorded same-seed before/after captures (`improved_graphics/images/environment/`, `videos/before_after_side_by_side.mp4`).
- Problem found: first prototype passes had dithered sunlight and clouds that looked dirty, the colour grade blew the sand out to white, scorch marks looked like smudges, and the first captures were not identical because the game ran in real time before the capture started.
- Change made and why: smooth lighting gradients, lower grade brightness (0.95), smaller crisper scorch decals, and a frame-stepped capture harness (`?capture&script`) so every before/after pair shows the exact same game state.

### [Art] Villain and hero review — 2026-11-25 — author
- Goal: run the same review loop on the final boss (Crab Emperor, from a screenshot) and on the hero, keeping the environment upgrades.
- Tool/model: Claude (Opus 5.5).
- Prompt: "Keep these suggestions. Run the same iteration to improve the final villain. You have a screenshot here. Run the same iteration to improve the hero. Suggest your proposal and wait for my OK to write the complete prompt." (+ screenshot of the Crab Emperor fight)
- Result: villain 3/10 → five upgrades (parts-based silhouette, animated rig, ground telegraphs per attack, entrance/phase II/death, boss UI). Hero 5/10 → five upgrades (18×23 redraw with teal vest, 4-frame animations, roll frames, slingshot and i-frame feedback, trait-based skins). Prototypes and captures in `improved_graphics/images/villain/`, `images/hero/` and the two videos.
- Problem found: the Crab Emperor code was not in the local folder, so the prototype ran on the older Crab King attacks; a stream of hits turned the boss into a white blob; palms sometimes hid the boss; the boss hitbox (radius 12) is much smaller than the new art; the back-view bandana knot is noisy.
- Change made and why: throttled hit flash (one 0.035 s flash per 0.3 s); the final prompt adds a radius ~22 boss hitbox, a no-tall-props zone around the boss, solid props, and asks the implementer to map telegraphs onto the Emperor's real attacks.

### [Art] Implementation prompt for the graphics upgrade — 2026-11-25 — author
- Goal: one prompt another AI can follow to reproduce all 15 upgrades exactly as in the captures.
- Tool/model: Claude (Opus 5.5) wrote it; target model: any coding assistant with repository access.
- Prompt: `improved_graphics/GRAPHICS_UPGRADE_PROMPT.md` (role, context, reference table, milestones with exact sizes/colours/timings, constraints, output format, acceptance checklist).
- Result: (fill in after running it)
- Problem found: (fill in)
- Change made and why: technique choice: the prompt ships the working prototype (`reference_code/prototype.patch`) and native-resolution target frames, so the implementer ports tested code instead of guessing from pictures; milestones keep the build runnable after each step.
