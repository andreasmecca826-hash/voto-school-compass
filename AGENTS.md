## Application rules
- SchoolPeriodsProvider derives filtered subjects without mutating imported data; all grade views and simulations use it to keep period calculations consistent.
- StudyProvider lives above navigation so the Pomodoro survives page changes; its deadline uses wall-clock time to survive background throttling.
- Study flashcards are session-only and support explicit JSON import/export; never silently claim cross-device or durable storage.
- Studio tools share the /studio route accessible from Altro; generic average calculation lives there, not inside the grade simulator.
