import { Trophy } from "lucide-react";
import { BottomSheet, Empty } from "./ui";
import { average, overallAverage } from "@/lib/voto/calc";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

const START_OF_WEEK = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - day + 1);
  return result;
};

export function AchievementsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const v = useVoto();
  const grades = v.data.subjects.flatMap((subject) => subject.grades);
  const avg = overallAverage(v.data.subjects);
  const comeback = v.data.subjects.some((subject) => {
    const gradesByDate = [...subject.grades].sort((a, b) => a.date.localeCompare(b.date));
    const first = gradesByDate[0]!.value;
    return gradesByDate.length >= 2 && average(subject.grades)! > first;
  });
  const consistent = v.data.subjects.filter((subject) => {
    const gradesByDate = [...subject.grades].sort((a, b) => a.date.localeCompare(b.date));
    const first = gradesByDate[0]!.value;
    return gradesByDate.length >= 2 && average(subject.grades)! > first;
  }).length >= 2;
  const weekStart = START_OF_WEEK(v.now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weeklyAssignments = v.data.assignments.filter((assignment) => {
    if (!assignment.dueDate) return false;
    const due = new Date(`${assignment.dueDate}T12:00:00`);
    return due >= weekStart && due <= weekEnd;
  });
  const organized = weeklyAssignments.length > 0 && weeklyAssignments.every((assignment) => v.isDone(assignment.id, assignment.completed));
  const prepared = v.interrogazioni.some((item) => item.checklist.length > 0 && item.checklist.every((preparation) => preparation.done));
  const achievements = [
    { emoji: "📗", title: "Prima valutazione", text: "Ricevi il tuo primo voto.", unlocked: grades.length > 0 },
    { emoji: "🎯", title: "Obiettivo raggiunto", text: "Raggiungi la media che ti eri prefissato.", unlocked: avg !== null && avg >= v.target },
    { emoji: "📈", title: "Rimonta", text: "Migliori la media di una materia.", unlocked: comeback },
    { emoji: "💯", title: "Voto perfetto", text: "Prendi 10 in una materia.", unlocked: grades.some((grade) => grade.value === 10) },
    { emoji: "🧠", title: "Secchione", text: "Raggiungi una media di almeno 9.", unlocked: avg !== null && avg >= 9 },
    { emoji: "🔥", title: "Settimana organizzata", text: "Completi tutti gli impegni della settimana.", unlocked: organized },
    { emoji: "📚", title: "Sempre preparato", text: "Completi la checklist di preparazione di un'interrogazione.", unlocked: prepared },
    { emoji: "🏅", title: "Costanza", text: "Migliori i tuoi risultati in più materie.", unlocked: consistent },
  ];
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Achievement" description={`${unlocked} di ${achievements.length} sbloccati`}>
      {achievements.length === 0 ? <Empty icon={<Trophy className="h-6 w-6" />} title="Nessun achievement" /> : <ul className="space-y-2">
        {achievements.map((achievement) => <li key={achievement.title} className={cn("card-surface flex items-center gap-3 p-3.5", !achievement.unlocked && "opacity-55")}>
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl", achievement.unlocked ? "bg-primary-soft" : "bg-surface grayscale")}>{achievement.emoji}</span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{achievement.title}</p><p className="text-xs text-muted-foreground">{achievement.text}</p></div>
          {achievement.unlocked && <Trophy className="h-4 w-4 shrink-0 text-primary" />}
        </li>)}
      </ul>}
    </BottomSheet>
  );
}
