import { evalsAndTerms, aggregateEvals, writeAggregateEvals } from "../main.js";

export default async function generateAggregateEvalsFile() {
  console.log("Generating aggregate evals...");
  for (const evaluation of evalsAndTerms.evals) {
    // Generate an aggregate rating for the professor, and also with granularity at department and course level.
    const profAggregateRatings = aggregateEvals[evaluation.profName] ?? {
      type: "prof",
    };
    const profRatingTypes = ["overall", evaluation.deptName, evaluation.courseCode];
    for (let i = 0; i < profRatingTypes.length; i++) {
      const ratingType = profRatingTypes[i];
      const currentRating = profAggregateRatings[ratingType] ?? getDefaultRating();
      const newRating = generateNewAggregateRating(currentRating, evaluation, i === 2, false);
      profAggregateRatings[ratingType] = newRating;
    }
    aggregateEvals[evaluation.profName] = profAggregateRatings;

    // Generate an aggregate rating for the course.
    let courseAggregateRating = aggregateEvals[evaluation.courseCode] ?? getDefaultRating();
    courseAggregateRating = generateNewAggregateRating(
      courseAggregateRating,
      evaluation,
      true,
      true
    );
    aggregateEvals[evaluation.courseCode] = courseAggregateRating;
  }
  console.log("Finished generating aggregate evals.");
  await writeAggregateEvals();
}

function generateNewAggregateRating(currentRating, evaluation, includeRecentTerms, isCourseEval) {
  const newRating = {
    quality_total: currentRating.quality_total + evaluation.qualityRating,
    quality_count: currentRating.quality_count + 1,
    difficulty_total: currentRating.difficulty_total + evaluation.difficultyRating ?? 0,
    difficulty_count: currentRating.difficulty_count + (evaluation.difficultyRating ? 1 : 0),
    workload_total: currentRating.workload_total + evaluation.workloadRating ?? 0,
    workload_count: currentRating.workload_count + (evaluation.workloadRating ? 1 : 0),
  };
  newRating.quality_avg = newRating.quality_total / newRating.quality_count;
  newRating.difficulty_avg = newRating.difficulty_total / newRating.difficulty_count;
  newRating.workload_avg = newRating.workload_total / newRating.workload_count;
  if (includeRecentTerms) {
    const recent_terms_set = new Set(currentRating.recent_terms);
    recent_terms_set.add(evalsAndTerms.termIdsToTermNames[evaluation.term]);
    newRating.recent_terms = Array.from(recent_terms_set).sort(mostRecentTermFirst);
  }
  if (isCourseEval) {
    if (newRating.recent_terms[0] === evalsAndTerms.termIdsToTermNames[evaluation.term]) {
      newRating.courseName = evaluation.courseName;
    }
    const profs_set = new Set(currentRating.professors);
    profs_set.add(evaluation.profName);
    newRating.professors = Array.from(profs_set).sort();
    newRating.type = "course";
  }
  return newRating;
}

function getDefaultRating() {
  return {
    quality_total: 0,
    quality_count: 0,
    quality_avg: 0, // quality_total / quality_count
    difficulty_total: 0,
    difficulty_count: 0,
    difficulty_avg: 0, // difficulty_total / difficulty_count
    workload_total: 0,
    workload_count: 0,
    workload_avg: 0, // workload_total / workload_count
  };
}

function mostRecentTermFirst(termA, termB) {
  const [quarterA, yearA] = termA.split(" ");
  const [quarterB, yearB] = termB.split(" ");
  if (yearA === yearB) {
    return quarterCompareDescending(quarterA, quarterB);
  } else {
    return yearB - yearA;
  }
}

function quarterCompareDescending(quarterA, quarterB) {
  const quarters = ["Fall", "Summer", "Spring", "Winter"];
  return quarters.indexOf(quarterA) - quarters.indexOf(quarterB);
}
