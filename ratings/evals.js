async function getEvalsRatings(instructor, subject, number) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('evals', (result) => {
            // if (chrome.runtime.lastError) {
            //     return reject(chrome.runtime.lastError);
            // }
            const evals = result.evals;
            // if (!evals || !evals[instructor]) {
            //     return resolve({ qualityAvg: null, difficultyAvg: null });
            // }
            const courses = evals[instructor];
            const rating = (courses && ((subject && (number && courses[`${subject}${number}`]) || courses[subject]) || courses['overall'])) || null;
            // if (!rating) {
            //     return resolve({ qualityAvg: null, difficultyAvg: null });
            // }
            // const qualitySum = courseEvals.reduce((sum, eval) => sum + eval.quality_avg, 0);
            // const difficultySum = courseEvals.reduce((sum, eval) => sum + eval.difficulty_avg, 0);
            // const count = courseEvals.length;
            // const qualityAvg = qualitySum / count;
            // const difficultyAvg = difficultySum / count;
            resolve(rating === null ? null : { avgRating: rating.quality_avg, avgDifficulty: rating.difficulty_avg });
        });
    });
}