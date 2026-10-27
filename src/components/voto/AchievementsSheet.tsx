import { CheckCircle2, LockKeyhole, Sparkles, Trophy } from "lucide-react";
import { BottomSheet, Empty, ProgressBar } from "./ui";
import { average, overallAverage } from "@/lib/voto/calc";
import { useQuestProgress, type QuestProgress } from "@/lib/voto/quest-system";
import { useClock, useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

const START_OF_WEEK = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
};

function QuestList({ quests }: { quests: QuestProgress[] }) {
  return (
    <ul className="space-y-2">
      {quests.map((quest) => {
        const progress = Math.min(quest.progress, quest.goal);
        return (
          <li key={quest.id} className="card-surface flex items-start gap-3 p-3.5">
            <span
              className={cn(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                quest.complete ? "bg-success-soft text-success" : "bg-primary-soft text-primary",
              )}
              aria-hidden="true"
            >
              {quest.complete ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{quest.title}</p>
                <span className="shrink-0 text-[10px] font-semibold text-primary">
                  {quest.complete && quest.claimed
                    ? `+${quest.reward} XP ottenuti`
                    : `+${quest.reward} XP`}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{quest.description}</p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {progress}/{quest.goal}
                </span>
                <span>{quest.complete ? "Completata" : "In corso"}</span>
              </div>
              <div className="mt-1.5">
                <ProgressBar value={(progress / quest.goal) * 100} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function AchievementsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const v = useVoto();
  const now = useClock();
  const quest = useQuestProgress(now);
  const grades = v.data.subjects.flatMap((subject) => subject.grades);
  const avg = overallAverage(v.data.subjects);
  const comeback = v.data.subjects.some((subject) => {
    const gradesByDate = [...subject.grades].sort((a, b) => a.date.localeCompare(b.date));
    const first = gradesByDate[0]!.value;
    return gradesByDate.length >= 2 && average(subject.grades)! > first;
  });
  const consistent =
    v.data.subjects.filter((subject) => {
      const gradesByDate = [...subject.grades].sort((a, b) => a.date.localeCompare(b.date));
      const first = gradesByDate[0]!.value;
      return gradesByDate.length >= 2 && average(subject.grades)! > first;
    }).length >= 2;
  const weekStart = START_OF_WEEK(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weeklyAssignments = v.data.assignments.filter((assignment) => {
    if (!assignment.dueDate) return false;
    const due = new Date(`${assignment.dueDate}T12:00:00`);
    return due >= weekStart && due <= weekEnd;
  });
  const organized =
    weeklyAssignments.length > 0 &&
    weeklyAssignments.every((assignment) => v.isDone(assignment.id, assignment.completed));
  const prepared = v.interrogazioni.some(
    (item) => item.checklist.length > 0 && item.checklist.every((preparation) => preparation.done),
  );
  const achievements = [
    {
      emoji: "📗",
      title: "Prima valutazione",
      text: "Ricevi il tuo primo voto.",
      unlocked: grades.length > 0,
    },
    {
      emoji: "🎯",
      title: "Obiettivo raggiunto",
      text: "Raggiungi la media che ti eri prefissato.",
      unlocked: avg !== null && avg >= v.target,
    },
    {
      emoji: "📈",
      title: "Rimonta",
      text: "Migliori la media di una materia.",
      unlocked: comeback,
    },
    {
      emoji: "💯",
      title: "Voto perfetto",
      text: "Prendi 10 in una materia.",
      unlocked: grades.some((grade) => grade.value === 10),
    },
    {
      emoji: "🧠",
      title: "Secchione",
      text: "Raggiungi una media di almeno 9.",
      unlocked: avg !== null && avg >= 9,
    },
    {
      emoji: "🔥",
      title: "Settimana organizzata",
      text: "Completi tutti gli impegni della settimana.",
      unlocked: organized,
    },
    {
      emoji: "📚",
      title: "Sempre preparato",
      text: "Completi la checklist di preparazione di un'interrogazione.",
      unlocked: prepared,
    },
    {
      emoji: "🏅",
      title: "Costanza",
      text: "Migliori i tuoi risultati in più materie.",
      unlocked: consistent,
    },
  ];
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Achievement"
      description={`${unlocked} di ${achievements.length} sbloccati · Livello ${quest.level}`}
    >
      <div className="space-y-5">
        <section className="card-surface border-primary/25 bg-gradient-to-br from-primary/10 to-transparent p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold">Livello {quest.level}</p>
                <p className="text-[11px] text-muted-foreground">{quest.xp} XP totali</p>
              </div>
            </div>
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-semibold text-primary">
              {quest.xpInLevel}/100 XP
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar value={quest.levelProgress} />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Mancano {quest.xpToNextLevel} XP al livello {quest.level + 1}.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <RewardStatus level={quest.level} requiredLevel={5} label="Tema completo Oro" />
            <RewardStatus level={quest.level} requiredLevel={10} label="Tema completo Diamante" />
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Missioni giornaliere</h2>
            <span className="text-[10px] text-muted-foreground">Si rinnovano ogni giorno</span>
          </div>
          <QuestList quests={quest.daily} />
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Missioni settimanali</h2>
            <span className="text-[10px] text-muted-foreground">Si rinnovano ogni lunedì</span>
          </div>
          <QuestList quests={quest.weekly} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Achievement</h2>
          {achievements.length === 0 ? (
            <Empty icon={<Trophy className="h-6 w-6" />} title="Nessun achievement" />
          ) : (
            <ul className="space-y-2">
              {achievements.map((achievement) => (
                <li
                  key={achievement.title}
                  className={cn(
                    "card-surface flex items-center gap-3 p-3.5",
                    !achievement.unlocked && "opacity-55",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                      achievement.unlocked ? "bg-primary-soft" : "bg-surface grayscale",
                    )}
                  >
                    {achievement.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">{achievement.text}</p>
                  </div>
                  {achievement.unlocked && <Trophy className="h-4 w-4 shrink-0 text-primary" />}
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="text-center text-[10px] text-muted-foreground">
          Progressi, XP e sblocchi sono salvati solo su questo dispositivo.
        </p>
      </div>
    </BottomSheet>
  );
}

function RewardStatus({
  level,
  requiredLevel,
  label,
}: {
  level: number;
  requiredLevel: number;
  label: string;
}) {
  const isUnlocked = level >= requiredLevel;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-2.5 py-2">
      {isUnlocked ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <LockKeyhole className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold">{label}</p>
        <p className="text-[9px] text-muted-foreground">
          {isUnlocked ? "Sbloccato" : `Livello ${requiredLevel}`}
        </p>
      </div>
    </div>
  );
}
