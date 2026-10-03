// Stores exam records in this browser (localStorage).
// Later, replace these 4 functions with Firebase/Firestore calls and the rest of the app stays the same.
const KEY = "exam_records_v1";

const write = (list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
};

export const getRecords = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

export const addRecord = (record) => write([record, ...getRecords()]);
export const deleteRecord = (id) => write(getRecords().filter((r) => r.id !== id));
export const clearRecords = () => write([]);

// Same student (name, ignoring case and extra spaces) + same subject + same exam
const norm = (x = "") => x.trim().replace(/\s+/g, " ").toLowerCase();
export const findAttempt = (name, subjectId, examId, list = getRecords()) =>
    name && name.trim() ?
    list.find((r) => norm(r.candidate) === norm(name) && r.subjectId === subjectId && r.examId === examId) :
    undefined;