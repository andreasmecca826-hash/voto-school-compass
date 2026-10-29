<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application rules
- SchoolPeriodsProvider derives filtered subjects without mutating imported data; all grade views and simulations use it to keep period calculations consistent.
- StudyProvider lives above navigation so the Pomodoro survives page changes; its deadline uses wall-clock time to survive background throttling.
- Study flashcards are session-only and support explicit JSON import/export; never silently claim cross-device or durable storage.
- Studio tools share the /studio route accessible from Altro; generic average calculation lives there, not inside the grade simulator.
