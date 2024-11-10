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
    qualityTotal: currentRating.qualityTotal + evaluation.qualityRating,
    qualityCount: currentRating.qualityCount + 1,
    difficultyTotal: currentRating.difficultyTotal + evaluation.difficultyRating ?? 0,
    difficultyCount: currentRating.difficultyCount + (evaluation.difficultyRating ? 1 : 0),
    workloadTotal: currentRating.workloadTotal + evaluation.workloadRating ?? 0,
    workloadCount: currentRating.workloadCount + (evaluation.workloadRating ? 1 : 0),
  };
  newRating.qualityAvg = newRating.qualityTotal / newRating.qualityCount;
  newRating.difficultyAvg = newRating.difficultyTotal / newRating.difficultyCount;
  newRating.workloadAvg = newRating.workloadTotal / newRating.workloadCount;
  if (includeRecentTerms) {
    const recentTermsSet = new Set(currentRating.recentTerms);
    recentTermsSet.add(evalsAndTerms.termIdsToTermNames[evaluation.term]);
    newRating.recentTerms = Array.from(recentTermsSet).sort(mostRecentTermFirst);
  }
  if (isCourseEval) {
    if (newRating.recentTerms[0] === evalsAndTerms.termIdsToTermNames[evaluation.term]) {
      newRating.courseName = evaluation.courseName;
    }
    const profsSet = new Set(currentRating.professors);
    profsSet.add(evaluation.profName);
    newRating.professors = Array.from(profsSet).sort();
    newRating.type = "course";
  }
  return newRating;
}

function getDefaultRating() {
  return {
    qualityTotal: 0,
    qualityCount: 0,
    qualityAvg: 0, // qualityTotal / qualityCount
    difficultyTotal: 0,
    difficultyCount: 0,
    difficultyAvg: 0, // difficultyTotal / difficultyCount
    workloadTotal: 0,
    workloadCount: 0,
    workloadAvg: 0, // workloadTotal / workloadCount
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
