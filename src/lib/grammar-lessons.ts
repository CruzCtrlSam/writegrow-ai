import { isProofreadingKind, type ProofreadingEdit } from "./proofreading";

export interface GrammarFix {
  id: string;
  original: string;
  answers: string[];
  hint: string;
  explanation: string;
}
export interface GrammarLesson {
  id: string;
  grade: number;
  title: string;
  format: "Sentence" | "Short passage" | "Paragraph" | "Short story";
  skill: string;
  teaching: string;
  example: string;
  parts: (string | GrammarFix)[];
}
const fix = (id: string, original: string, answer: string, hint: string, explanation: string, alternatives: string[] = []): GrammarFix => ({ id, original, answers: [answer, ...alternatives], hint, explanation });
const lesson = (grade: number, step: number, title: string, format: GrammarLesson["format"], skill: string, teaching: string, example: string, parts: GrammarLesson["parts"]): GrammarLesson => ({ id: `g${grade}-${step}`, grade, title, format, skill, teaching, example, parts });

// Every passage and teaching example is written specifically for WriteGrow.
export const GRAMMAR_LESSONS: GrammarLesson[] = [
  lesson(3, 1, "A tiny garden", "Sentence", "Capital letters", "Begin a sentence and a person's name with a capital letter.", "Nora plants a seed.", [fix("start", "my", "My", "Look at the first letter of the sentence.", "Start a sentence with a capital letter."), " friend ", fix("name", "eli", "Eli", "A person's name begins with a special kind of letter.", "Use a capital letter at the start of Eli's name."), " grows beans in a cup."]),
  lesson(3, 2, "Birds at the window", "Short passage", "Matching subjects and verbs", "Use is for one bird and are for more than one bird.", "The robin is quiet. The robins are quiet.", ["Two birds ", fix("birds", "is", "are", "How many birds are there?", "Use are because two birds means more than one."), " outside my window. One bird ", fix("one", "are", "is", "This sentence is about just one bird.", "Use is when the subject is one bird."), " carrying a twig."]),
  lesson(3, 3, "The missing mitten", "Paragraph", "Contractions", "An apostrophe marks the letters left out when two words become one.", "Cannot becomes can't.", ["I looked for my mitten before school. I ", fix("could", "couldnt", "couldn't", "This word is short for could not.", "Couldn't needs an apostrophe where the o in not was left out."), " find it in my bag. My sister said, \"", fix("it", "Its", "It's", "Here, the word means it is.", "It's needs an apostrophe because it means it is."), " beside your boots!\" I thanked her and put it on."]),
  lesson(4, 1, "The pond team", "Sentence", "Subjects joined by and", "Two people joined by and usually need a plural verb.", "Ava and Ben are partners.", ["Leo and I ", fix("team", "was", "were", "The subject includes two people.", "Use were because Leo and I is a plural subject."), " watching frogs while our teacher ", fix("teacher", "were", "was", "This subject names one teacher.", "Use was because our teacher is one person."), " taking notes."]),
  lesson(4, 2, "One dog's discovery", "Short passage", "Possession and contractions", "An apostrophe can show who owns something or mark missing letters in a contraction.", "The cat's toy isn't here.", ["One dog found a shell on the beach. The ", fix("owner", "dogs", "dog's", "The tail belongs to one dog.", "Add apostrophe-s to show that the tail belongs to the dog."), " tail wagged. We ", fix("cannot", "didnt", "didn't", "This means did not.", "Didn't needs an apostrophe to stand for the missing o in not."), " take the shell home."]),
  lesson(4, 3, "Our class picnic", "Paragraph", "Commonly confused words", "Their shows belonging, they're means they are, and there can name a place.", "They're packing their lunches over there.", ["Our class planned a picnic beside the pond. Everyone packed ", fix("their", "there", "their", "The lunches belong to the students.", "Use their to show that the lunches belong to the students."), " lunch. Sam brought a blanket and said, \"", fix("they", "Their", "They're", "Try replacing this word with they are.", "Use They're because it means They are."), " saving a shady spot for us.\" We ate together and watched the ducks."]),
  lesson(5, 1, "Yesterday's experiment", "Sentence", "Consistent past tense", "When events happened yesterday, keep the verbs in the past tense.", "Yesterday, we mixed colors and painted a sign.", ["Yesterday, I ", fix("build", "build", "built", "The word yesterday tells you when this happened.", "Built is the past tense of build."), " a paper bridge and ", fix("test", "test", "tested", "This action also happened yesterday.", "Use tested to keep both actions in the past tense."), " it with coins."]),
  lesson(5, 2, "The team's robot", "Short passage", "Pronouns", "Use I with a subject doing an action; use me after a verb or a word such as to.", "Lena and I worked. The teacher helped Lena and me.", [fix("subject", "Me", "I", "Try the sentence without and my partner.", "Use I because I and my partner are doing the action."), " and my partner designed a robot. Our teacher gave my partner and ", fix("object", "I", "me", "Try saying our teacher gave me a new battery.", "Use me because the teacher gave something to the speaker."), " a new battery. Soon the robot rolled across the table."]),
  lesson(5, 3, "The library surprise", "Paragraph", "Irregular verbs", "Some past-tense verbs change their spelling instead of adding -ed.", "We went upstairs and saw the display.", ["Last Saturday, our reading club visited the library. We ", fix("go", "goed", "went", "Think of the past tense of go.", "Went is the past tense of go."), " to a room filled with maps. I ", fix("see", "seen", "saw", "There is no helping verb before this past-tense action.", "Use saw for a past action without a helping verb such as have."), " a map of our town from long ago. The librarian ", fix("bring", "bringed", "brought", "Bring has a special past-tense form.", "Brought is the past tense of bring."), " out a magnifying glass so we could study the tiny streets."]),
  lesson(6, 1, "The box of clues", "Sentence", "Subject-verb agreement", "Match a verb to its subject, even when other words come between them.", "The basket of apples is heavy.", ["The box of old letters ", fix("box", "were", "was", "What is the sentence about: one box or several letters?", "Use was because the subject is the singular noun box."), " dusty, but the notes inside it ", fix("notes", "was", "were", "This part of the sentence is about several notes.", "Use were because notes is plural."), " easy to read."]),
  lesson(6, 2, "A rainy rehearsal", "Short passage", "Joining complete thoughts", "A comma alone cannot join two complete sentences; use a period, a semicolon, or a comma with a joining word.", "The wind rose, so we went inside.", ["Rain tapped on the stage roof", fix("join", ", we", ", so we", "Each side could be a complete sentence.", "A comma with so connects these two complete thoughts.", [". We", "; we", ", and we"]), " moved our rehearsal indoors. Everyone found a place in the hall. We practiced until the last bell rang."]),
  lesson(6, 3, "The model town", "Paragraph", "Pronoun case and verb agreement", "Check who does each action and whether the subject is singular or plural.", "She and Amir work together. Their model has a tower.", [fix("she", "Her", "She", "This pronoun is part of the subject doing the action.", "Use She because she and Noah are doing the action."), " and Noah are building a model town. The streets between the houses ", fix("streets", "is", "are", "Find the subject before the phrase between the houses.", "Use are because the subject streets is plural."), " narrow. Their teacher gave Noah and ", fix("her", "she", "her", "This pronoun receives what the teacher gave.", "Use her after the verb gave because she receives the materials."), " extra cardboard. By Friday, they had added a park and a tiny train station."]),
  lesson(7, 1, "A balanced plan", "Sentence", "Parallel structure", "Give items in a list the same grammatical form so the sentence is easy to follow.", "We enjoy drawing, painting, and sculpting.", ["Our club enjoys designing posters, ", fix("paint", "to paint", "painting", "Match the -ing form in designing.", "Use painting to match the other -ing actions in the list."), " scenery, and ", fix("build", "build", "building", "Keep the same form for the final action.", "Use building so all three actions follow the same pattern."), " props."]),
  lesson(7, 2, "The experiment report", "Paragraph", "Agreement across phrases", "Words inside a phrase do not change the number of the main subject.", "Each of the jars contains water.", ["Each of the science teams ", fix("each", "have", "has", "Each refers to one team at a time.", "Use has because the subject each is singular."), " a different question. The list of materials ", fix("list", "include", "includes", "The main subject is list, not materials.", "Use includes to agree with the singular subject list."), " string, cups, and tape. Our team measures the string carefully before every trial. We write down each result so another team can repeat our experiment."]),
  lesson(7, 3, "The night hike", "Short story", "Keeping a story in the past", "Keep the time of a story steady unless there is a clear reason to change it.", "We had packed a lamp before we left camp.", ["Our group left camp just before sunset. I had ", fix("take", "took", "taken", "After had, use the past participle of take.", "Use taken after the helping verb had."), " a small lamp from my pack. We followed a trail to the lake, where the last light made the water shine. Then a branch snapped behind us. Jo ", fix("turn", "turns", "turned", "The surrounding events all happened in the past.", "Use turned to keep this event in the past tense."), " and held up a hand. We waited without speaking. A rabbit hopped into view and vanished beneath a bush. Everyone laughed softly. When we returned, our guide asked what we had ", fix("see", "saw", "seen", "Which form of see follows had?", "Use seen after the helping verb had."), ". We told her about the quiet lake and our very small surprise."]),
  lesson(8, 1, "A careful recommendation", "Sentence", "The subjunctive mood", "After a recommendation with that, use the base form of the verb.", "The coach recommends that every player arrive early.", ["The council recommends that each student ", fix("submit", "submits", "submit", "This is a recommendation, not a report of what usually happens.", "Use the base form submit after recommends that."), " a proposal and that the committee ", fix("review", "reviews", "review", "The same recommendation pattern continues here.", "Use the base form review in the second recommendation."), " every idea."]),
  lesson(8, 2, "A stronger argument", "Paragraph", "Agreement and parallel structure", "Match verbs to their main subjects and keep paired ideas in the same form.", "The set of tools is useful for measuring and cutting.", ["The collection of student proposals ", fix("collection", "show", "shows", "Find the main subject before of student proposals.", "Use shows because collection is singular."), " how much we care about our school. Our plan focuses on reducing waste and ", fix("reuse", "to reuse", "reusing", "Match the -ing form in reducing.", "Use reusing to give both actions the same grammatical form."), " materials. Each of the suggested changes ", fix("each", "are", "is", "The word each treats the changes one at a time.", "Use is because each is singular."), " small enough to try this month. We can record our results and share them at the next meeting. That evidence will help the council decide what to continue."]),
  lesson(8, 3, "The signal in the attic", "Short story", "Editing in context", "In a longer story, check verb forms, sentence joins, and lists while keeping the writer's meaning.", "We had begun our search; soon we were finding and sorting clues.", ["Mira and Devon spent Saturday helping their aunt clear the attic. Behind a stack of picture frames, they found a wooden case with a brass handle. Neither of them had ", fix("begin", "began", "begun", "Which form of begin belongs after had?", "Use begun after the helping verb had."), " to open it when a faint clicking sound came from inside. Mira set the case on the floor and lifted the lid. A small machine sat beneath a cloth, surrounded by neatly folded papers. The label on the papers ", fix("label", "were", "was", "The subject is the one label, not the papers.", "Use was because label is singular."), " faded but readable. Devon found a note beside the handle", fix("join", ", it", "; it", "Both sides of this comma can stand as complete sentences.", "A semicolon can join these two closely related complete thoughts.", [". It", ", and it"]), " explained how to send a simple signal. They spent the next hour reading instructions, ", fix("test", "to test", "testing", "Match reading and adjusting in the list.", "Use testing so all three actions have the same -ing form."), " the keys, and adjusting a loose wire. At last, the machine clicked out a steady pattern. Their aunt heard it from the stairs and smiled. She recognized the signal her father had taught her years before."]),
  lesson(3, 4, "The listening walk", "Short passage", "Missing and extra marks", "A repeated word can be taken out; a missing apostrophe can be added in.", "We can listen. We don't need to shout.", ["We can ", fix("extra", "can", "", "One word appears twice in a row.", "Take out the extra can so the sentence has only one."), " hear birds in the park. We ", fix("apostrophe", "dont", "don't", "This word means do not.", "Add an apostrophe between n and t to make don't."), " make much noise."]),
  lesson(4, 4, "A quiet discovery", "Paragraph", "Taking out and adding in", "Keep one copy of a repeated word and use an apostrophe in a contraction.", "The door isn't open.", ["Our class walked past the ", fix("extra", "the", "", "Look for a word that has been repeated.", "Take out the extra the before pond."), " pond. A frog sat on a flat stone. \"", fix("apostrophe", "Its", "It's", "The speaker means it is.", "Add an apostrophe to make It's, which means It is."), " so still,\" Mia whispered. We watched until it jumped into the water."]),
  lesson(5, 4, "The old instrument", "Paragraph", "Articles and repeated words", "Use an before a vowel sound, and remove an accidentally repeated word.", "An owl landed on the fence.", ["Our music teacher brought ", fix("article", "a", "an", "Listen to the vowel sound at the start of old.", "Add n to a because an comes before the vowel sound in old."), " old violin to class. We could ", fix("extra", "could", "", "Does the helping verb appear twice?", "Take out the extra could so the helping verb appears once."), " hear a soft hum as she tuned it. Then she played a tune that her grandfather had taught her."]),
  lesson(6, 4, "A trail of notes", "Paragraph", "Possessive apostrophes", "Add apostrophe-s for one owner; put an apostrophe after the s for a regular plural owner.", "One artist's brush lay beside the other artists' brushes.", ["The map showed our ", fix("owner", "guide", "guide's", "The notebook belongs to one guide.", "Add apostrophe-s because one guide owns the notebook."), " notebook beside the shelter. We walked toward ", fix("extra", "toward", "", "A direction word has been repeated.", "Take out the second toward before the shelter."), " the shelter and found it on a bench. The guide thanked us and used her notes to plan the next part of our walk."]),
  lesson(7, 4, "A useful connection", "Paragraph", "Connecting complete sentences", "Use a joining word after a comma to connect two complete thoughts.", "The path was muddy, so we wore boots.", ["Our team measured the stream", fix("join", ", we", ", so we", "The second thought tells what happened because of the first.", "Add so after the comma to connect the two complete thoughts.", [". We", "; we", ", and we"]), " could compare it with last month's results. We wrote each result in ", fix("extra", "in", "", "A small word appears twice before our notebook.", "Take out the second in before our notebook."), " our notebook. The measurements suggested that the water was rising. We shared our notes with the park ranger before heading home."]),
  lesson(8, 4, "The exhibit opening", "Short story", "Proofreading for clarity", "Remove accidental repetitions and show plural ownership with an apostrophe after the plural s.", "The volunteers' work filled the hall.", ["The library doors opened just as our class arrived with the final display. For weeks, we had worked with ", fix("extra", "with", "", "A preposition has been typed twice.", "Take out the repeated with before local historians."), " local historians to collect stories about the town. Each interview revealed a detail that the old photographs could not show. The librarian arranged the ", fix("plural-owner", "students", "students'", "The designs belong to several students.", "Add an apostrophe after the plural s because the designs belong to several students."), " designs along the wall. Families stopped to read them, pointing out faces and places they recognized. One visitor paused beside a picture of the old bakery. She told us that her mother had worked there as a teenager. We asked whether she would share that memory in a new interview. She agreed, and our teacher found a quiet table. By the time the exhibit closed, we already had another story to add to our collection."]),
];

export function lessonFixes(lesson: GrammarLesson): GrammarFix[] {
  return lesson.parts.filter((part): part is GrammarFix => typeof part !== "string");
}
export function passageTargets(lesson: GrammarLesson): (string | { id: string; original: string })[] {
  return lesson.parts.flatMap((part, index) => typeof part === "string"
    ? part.split(/(\s+)/).filter(Boolean).map((text, token) => /^\s+$/.test(text) ? text : { id: `text-${index}-${token}`, original: text })
    : [{ id: part.id, original: part.original }]);
}
export function passageText(lesson: GrammarLesson, values: Record<string, string>) {
  return passageTargets(lesson).map((target) => typeof target === "string" ? target : values[target.id] ?? target.original).join("");
}
export function lessonsForGrade(grade: number) {
  return GRAMMAR_LESSONS.filter((lesson) => lesson.grade === grade);
}
function normalize(value: string) {
  return value.trim().replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ");
}
export function checkGrammarLesson(lesson: GrammarLesson, values: Record<string, string>) {
  // Compare passages as well as slots: deleting either copy of a repeated word is valid.
  let candidates: { text: string; correct: Set<string> }[] = [{ text: "", correct: new Set() }];
  for (const part of lesson.parts) {
    if (typeof part === "string") candidates = candidates.map((candidate) => ({ ...candidate, text: candidate.text + part }));
    else candidates = candidates.flatMap((candidate) => [
      { text: candidate.text + part.original, correct: candidate.correct },
      ...part.answers.map((answer) => ({ text: candidate.text + answer, correct: new Set([...candidate.correct, part.id]) })),
    ]);
  }
  const actual = normalize(passageText(lesson, values));
  const matching = candidates.filter((candidate) => normalize(candidate.text) === actual).sort((a, b) => b.correct.size - a.correct.size)[0];
  return lessonFixes(lesson).map((fix) => ({ ...fix, correct: matching ? matching.correct.has(fix.id) : fix.answers.some((answer) => normalize(answer) === normalize(values[fix.id] ?? fix.original)) }));
}
export interface GrammarProgress {
  selected: string;
  drafts: Record<string, Record<string, string>>;
  completed: string[];
  assisted: string[];
  proofreading?: Record<string, ProofreadingEdit[]>;
}
export function emptyGrammarProgress(grade: number): GrammarProgress {
  return { selected: lessonsForGrade(grade)[0]?.id ?? "", drafts: {}, completed: [], assisted: [] };
}
export function grammarStorageKey(studentId: string) { return `writegrow:grammar:v1:${encodeURIComponent(studentId)}`; }
export function restoreGrammarProgress(raw: string | null, grade: number): GrammarProgress {
  const fallback = emptyGrammarProgress(grade);
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || !value.drafts || typeof value.drafts !== "object" || Array.isArray(value.drafts) || !Array.isArray(value.completed) || !Array.isArray(value.assisted)) return fallback;
    const validIds = new Set(GRAMMAR_LESSONS.map((lesson) => lesson.id));
    const drafts: GrammarProgress["drafts"] = {};
    for (const lesson of GRAMMAR_LESSONS) {
      const saved = value.drafts[lesson.id];
      if (!saved || typeof saved !== "object") continue;
      drafts[lesson.id] = Object.fromEntries(passageTargets(lesson).filter((target): target is { id: string; original: string } => typeof target !== "string" && typeof saved[target.id] === "string").map((target) => [target.id, saved[target.id]]));
    }
    const proofreading: Record<string, ProofreadingEdit[]> = {};
    if (value.proofreading && typeof value.proofreading === "object") for (const lesson of GRAMMAR_LESSONS) {
      const history = value.proofreading[lesson.id];
      if (!Array.isArray(history)) continue;
      proofreading[lesson.id] = history.filter((edit: unknown): edit is ProofreadingEdit => {
        if (!edit || typeof edit !== "object") return false;
        const item = edit as ProofreadingEdit;
        return isProofreadingKind(item.kind) && typeof item.before === "string" && typeof item.after === "string" && passageTargets(lesson).some((target) => typeof target !== "string" && target.id === item.fixId);
      }).slice(-30);
    }
    return { selected: lessonsForGrade(grade).some((lesson) => lesson.id === value.selected) ? value.selected : fallback.selected, drafts, completed: value.completed.filter((id: unknown) => typeof id === "string" && validIds.has(id)), assisted: value.assisted.filter((id: unknown) => typeof id === "string" && validIds.has(id)), ...(Object.keys(proofreading).length ? { proofreading } : {}) };
  } catch { return fallback; }
}
