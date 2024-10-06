import { evalsAndTerms, aggregateEvals, writeAggregateEvals } from "../main.js";

export default async function generateAggregateEvalsFile() {
  console.log("Generating aggregate evals...");
  for (const evaluation of evalsAndTerms.evals) {
    const profName = evaluation.profName;
    const deptName = evaluation.deptName;
    const courseCode = evaluation.courseCode;
    const qualityRating = evaluation.qualityRating;
    const difficultyRating = evaluation.difficultyRating;
    const workloadRating = evaluation.workloadRating;

    const currentProf = aggregateEvals[profName] ?? {};
    const profRatingTypes = ["overall", deptName, courseCode];
    for (const ratingType of profRatingTypes) {
      const currentRating = currentProf[ratingType] ?? getDefaultRating();
      const newRating = {
        quality_total: currentRating.quality_total + qualityRating,
        quality_count: currentRating.quality_count + 1,
        difficulty_total: currentRating.difficulty_total + difficultyRating ?? 0,
        difficulty_count: currentRating.difficulty_count + (difficultyRating ? 1 : 0),
        workload_total: currentRating.workload_total + workloadRating ?? 0,
        workload_count: currentRating.workload_count + (workloadRating ? 1 : 0),
      };
      newRating.quality_avg = newRating.quality_total / newRating.quality_count;
      newRating.difficulty_avg = newRating.difficulty_total / newRating.difficulty_count;
      newRating.workload_avg = newRating.workload_total / newRating.workload_count;
      currentProf[ratingType] = newRating;
    }
    aggregateEvals[profName] = currentProf;
  }
  // Write back to JSON
  await writeAggregateEvals();
  console.log("Finished generating aggregate evals.");
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
