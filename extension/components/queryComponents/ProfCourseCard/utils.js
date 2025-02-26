export function extractTerms(recentTerms) {
  const termPattern = /(Spring|Summer|Fall|Winter)/gi;
  const simplifiedTerms = recentTerms
    .map((term) => term.match(termPattern))
    .flat()
    .filter(Boolean);
  const uniqueTerms = [...new Set(simplifiedTerms)];
  return uniqueTerms;
}

export function sortByScore(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
    ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
    ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
    
    const ratingB = objB[1];
    ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
    ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
    ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
    
    const scoreA =
      ratingA.qualityAvg +
      (5 - ratingA.difficultyAvg) +
      (15 - ratingA.workloadAvg);
    const scoreB =
      ratingB.qualityAvg +
      (5 - ratingB.difficultyAvg) +
      (15 - ratingB.workloadAvg);
    
    return scoreB - scoreA; // Default: Sort by descending score
  });
}

export function sortByScoreAscending(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
    ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
    ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
    
    const ratingB = objB[1];
    ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
    ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
    ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
    
    const scoreA =
      ratingA.qualityAvg +
      (5 - ratingA.difficultyAvg) +
      (15 - ratingA.workloadAvg);
    const scoreB =
      ratingB.qualityAvg +
      (5 - ratingB.difficultyAvg) +
      (15 - ratingB.workloadAvg);
    
    return scoreA - scoreB; // Sort by ascending score
  });
}

export function sortByQuality(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
    
    const ratingB = objB[1];
    ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
    
    return ratingB.qualityAvg - ratingA.qualityAvg; // Sort by descending quality
  });
}

export function sortByQualityAscending(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.qualityAvg = ratingA.qualityTotal / ratingA.qualityCount;
    
    const ratingB = objB[1];
    ratingB.qualityAvg = ratingB.qualityTotal / ratingB.qualityCount;
    
    return ratingA.qualityAvg - ratingB.qualityAvg; // Sort by ascending quality
  });
}

export function sortByDifficulty(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
    
    const ratingB = objB[1];
    ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
    
    return ratingB.difficultyAvg - ratingA.difficultyAvg; // Sort by descending difficulty
  });
}

export function sortByDifficultyAscending(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.difficultyAvg = ratingA.difficultyTotal / ratingA.difficultyCount;
    
    const ratingB = objB[1];
    ratingB.difficultyAvg = ratingB.difficultyTotal / ratingB.difficultyCount;
    
    return ratingA.difficultyAvg - ratingB.difficultyAvg; // Sort by ascending difficulty
  });
}

export function sortByWorkload(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
    
    const ratingB = objB[1];
    ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
    
    return ratingB.workloadAvg - ratingA.workloadAvg; // Sort by descending workload
  });
}

export function sortByWorkloadAscending(items, data, selectedId, isCourse = false) {
  const mappedItems = items.map((item) => {
    const rating = isCourse ? item[1] : data[item][selectedId];
    return [isCourse ? item[0] : item, rating];
  });

  return mappedItems.sort((objA, objB) => {
    const ratingA = objA[1];
    ratingA.workloadAvg = ratingA.workloadTotal / ratingA.workloadCount;
    
    const ratingB = objB[1];
    ratingB.workloadAvg = ratingB.workloadTotal / ratingB.workloadCount;
    
    return ratingA.workloadAvg - ratingB.workloadAvg; // Sort by ascending workload
  });
}

export function getRecencyIndicator(lastTaughtQuarter) {
  const lastSeason = lastTaughtQuarter.split(" ")[0];
  const lastYear = parseInt(lastTaughtQuarter.split(" ")[1]);
  const lastSeasonMonth =
    lastSeason === "Winter"
      ? 3
      : lastSeason === "Spring"
      ? 6
      : lastSeason === "Summer"
      ? 8
      : 12;
  const lastTaughtQuarterDate = new Date(`${lastYear}-${lastSeasonMonth}-01`);
  const currentQuarterDate = new Date();
  const differenceInDays =
    (currentQuarterDate - lastTaughtQuarterDate) / 86400000;

  if (differenceInDays <= 365) {
    return {
      label: "Taught Within 1yr",
      icon: "check",
      color: "success"
    };
  } else {
    return {
      label: `Last: ${lastSeason} ${lastYear}`,
      icon: "warning",
      color: "warning"
    };
  }
}

export function getDeptAvgs(profDepts, type, data) {
  const aggregatedAvgs = [];
  for (const dept of profDepts) {
    if (data.departmentStatistics[dept][`${type}Avgs`].length > 0) {
      aggregatedAvgs.push(...data.departmentStatistics[dept][`${type}Avgs`]);
    }
  }
  return aggregatedAvgs.sort();
}