import { t as daysBetween } from "./dates-CdBXaUB1.js";
//#region src/lib/voto/selectors.ts
function selectDashboardAssignments(assignments, now, isDone = (_id, completed) => completed) {
	return assignments.filter((assignment) => {
		if (isDone(assignment.id, assignment.completed)) return false;
		if (!assignment.dueDate) return false;
		const distance = daysBetween(now, assignment.dueDate);
		return distance >= 0 && distance <= 1;
	}).sort((a, b) => `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`));
}
function selectNotificationsByType(notifications, type, limit = 3) {
	return notifications.filter((notification) => notification.type === type).slice(0, limit);
}
function notificationContentLabel(notification) {
	return Boolean(notification.attachments?.length || notification.attachmentPath || notification.attachmentUrl || notification.attachmentName) ? "Circolari" : "Comunicazioni";
}
var GENERIC_NOTICE_TITLES = /* @__PURE__ */ new Set([
	"avviso",
	"bacheca",
	"circolare",
	"circolari",
	"comunicazione",
	"comunicazioni"
]);
function isGenericNoticeTitle(notification) {
	return notification.type === "notice" && GENERIC_NOTICE_TITLES.has(notification.title.trim().toLocaleLowerCase("it-IT"));
}
function notificationDisplayTitle(notification) {
	if (!isGenericNoticeTitle(notification)) return notification.title;
	return notificationContentLabel(notification) === "Circolari" ? "Circolare" : "Comunicazione";
}
function reminderDaysFromNow(notification, now) {
	const date = notification.date?.slice(0, 10);
	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
	const parsed = /* @__PURE__ */ new Date(`${date}T00:00:00.000Z`);
	if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
	return daysBetween(now, date);
}
function selectUpcomingReminders(notifications, now) {
	return notifications.filter((notification) => notification.type === "reminder").filter((notification) => {
		const days = reminderDaysFromNow(notification, now);
		return days === null || days >= 0;
	}).sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}
function selectPastReminders(notifications, now, maxDays = 30) {
	const windowDays = Math.min(30, Math.max(0, Math.floor(maxDays)));
	return notifications.filter((notification) => notification.type === "reminder").filter((notification) => {
		const days = reminderDaysFromNow(notification, now);
		return days !== null && days < 0 && days >= -windowDays;
	}).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
function selectOpenInterrogazioni(interrogazioni, limit = 3) {
	return interrogazioni.filter((item) => !item.completed).slice(0, limit);
}
//#endregion
export { selectNotificationsByType as a, selectUpcomingReminders as c, selectDashboardAssignments as i, notificationContentLabel as n, selectOpenInterrogazioni as o, notificationDisplayTitle as r, selectPastReminders as s, isGenericNoticeTitle as t };
