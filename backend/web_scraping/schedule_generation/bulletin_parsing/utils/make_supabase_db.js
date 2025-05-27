import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const aggregateCourseEvalsFile = './local_data/aggregate_evals.json';
const aggregateCourseEvals = JSON.parse(
  fs.readFileSync(aggregateCourseEvalsFile, 'utf-8')
);

// Configure Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function makeSupabaseDB(catalogJsonFilename) {
  const catalog = JSON.parse(
    fs.readFileSync(`./local_data/${catalogJsonFilename}`, 'utf-8')
  );

  console.log('Inserting data into Supabase...');

  // Helper for inserting data and handling errors
  const insertData = async (tableName, data) => {
    const { error } = await supabase.from(tableName).insert(data);
    if (error) {
      console.error(`Error inserting into ${tableName}:`, error);
    }
  };

  for (const school of catalog.schools) {
    await insertData('schools', {
      name: school.name,
      description: school.description,
      courserequirementsexpression: treeNodeToString(school.courseRequirements.tree),
      unitrequirements: school.unitRequirements, // Supabase JSONB handles objects directly
      otherrequirements: school.courseRequirements.thingsNotEncoded.join('\n'),
      othernotes: school.otherNotes.join('\n'),
      src: school.src,
    });
  }
  console.log('Schools inserted.');

  for (const deptOrProgram of catalog.deptsAndPrograms) {
    await insertData('deptsandprograms', {
      name: deptOrProgram.name,
      description: deptOrProgram.description,
      majors: deptOrProgram.majors.map((major) => major.name).join(', '),
      minors: deptOrProgram.minors.map((minor) => minor.name).join(', '),
      emphases: deptOrProgram.emphases.map((emphasis) => emphasis.name).join(', '),
      school: deptOrProgram.school,
      src: deptOrProgram.src,
    });

    for (const major of deptOrProgram.majors) {
      await insertData('majors', {
        name: major.name,
        description: major.description,
        deptcode: major.departmentCode,
        requiresemphasis: major.requiresEmphasis, // Boolean directly
        courserequirementsexpression: treeNodeToString(major.courseRequirements),
        otherrequirements: major.courseRequirements.thingsNotEncoded.join('\n'),
        unitrequirements: major.unitRequirements,
        othernotes: major.otherNotes.join('\n'),
        src: major.src,
      });
    }
    for (const minor of deptOrProgram.minors) {
      await insertData('minors', {
        name: minor.name,
        description: minor.description,
        deptcode: minor.departmentCode,
        requiresemphasis: minor.requiresEmphasis,
        courserequirementsexpression: treeNodeToString(minor.courseRequirements),
        otherrequirements: minor.courseRequirements.thingsNotEncoded.join('\n'),
        unitrequirements: minor.unitRequirements,
        othernotes: minor.otherNotes.join('\n'),
        src: minor.src,
      });
    }
    for (const emphasis of deptOrProgram.emphases) {
      await insertData('emphases', {
        name: emphasis.name,
        description: emphasis.description,
        appliesto: emphasis.appliesTo,
        nameofwhichitappliesto: emphasis.nameOfWhichItAppliesTo,
        deptcode: emphasis.departmentCode,
        courserequirementsexpression: treeNodeToString(emphasis.courseRequirements),
        otherrequirements: emphasis.courseRequirements.thingsNotEncoded.join('\n'),
        unitrequirements: emphasis.unitRequirements,
        othernotes: emphasis.otherNotes.join('\n'),
        src: emphasis.src,
      });
    }
  }
  console.log('DeptsAndPrograms, Majors, Minors, Emphases inserted.');


  for (const specialProgram of catalog.specialPrograms) {
    await insertData('specialprograms', {
      name: specialProgram.name,
      description: specialProgram.description,
      courserequirementsexpression: treeNodeToString(specialProgram.courseRequirements),
      otherrequirements: specialProgram.courseRequirements.thingsNotEncoded.join('\n'),
      unitrequirements: specialProgram.unitRequirements,
      othernotes: specialProgram.otherNotes,
      src: specialProgram.src,
    });
  }
  console.log('SpecialPrograms inserted.');

  for (const course of catalog.courses) {
    let offeringSchedule = `Expected schedule: ${course.otherOfferingSchedule || course.offeringSchedule}; historically, ${getHistoricalOfferingSeasons(course.courseCode)}`;
    const fulfillscorerequirements = Array.from(new Set(catalog.coreCurriculum.requirements.filter(
      (req) =>
        req.fulfilledBy &&
        req.fulfilledBy.includes(course.courseCode)
    ).map((req) => `"${req.requirementName}"`)));

    await insertData('courses', {
      coursecode: course.courseCode,
      name: course.name,
      description: course.description,
      numunits: course.numUnits,
      prerequisitecourses: course.prerequisiteCourses,
      corequisitecourses: course.corequisiteCourses,
      otherrequirements: course.otherRequirements,
      othernotes: course.otherNotes,
      offeringschedule: offeringSchedule,
      nextquarterofferings: course.nextQuarterOfferings,
      historicalbestprofessors: getHistoricalBestProfessors(course.courseCode),
      fulfillscorerequirements: fulfillscorerequirements.length > 0
        ? fulfillscorerequirements.join(', ')
        : null,
      src: course.src,
    });
  }
  console.log('Courses inserted.');

  for (const coreCurriculumRequirement of catalog.coreCurriculum.requirements) {
    await insertData('corecurriculumrequirements', {
      name: coreCurriculumRequirement.requirementName,
      description: coreCurriculumRequirement.requirementDescription,
      appliesto: coreCurriculumRequirement.appliesTo,
      fulfilledby: coreCurriculumRequirement.fulfilledBy, // JSONB handles arrays directly
      src: coreCurriculumRequirement.src,
    });
  }
  console.log('CoreCurriculumRequirements inserted.');

  for (const coreCurriculumPathway of catalog.coreCurriculum.pathways) {
    await insertData('corecurriculumpathways', {
      name: coreCurriculumPathway.name,
      description: coreCurriculumPathway.description,
      associatedcourses: coreCurriculumPathway.associatedCourses, // JSONB handles arrays directly
      src: coreCurriculumPathway.src,
    });
  }
  console.log('CoreCurriculumPathways inserted.');

  console.log('All data inserted into Supabase!');
}

function getHistoricalBestProfessors(courseCode) {
  const courseEval = aggregateCourseEvals[courseCode];
  if (!courseEval) {
    return null;
  }
  const bestProfs = courseEval.professors
    .filter((professor) => {
      const professorEntry = aggregateCourseEvals[professor] && aggregateCourseEvals[professor][courseCode];
      // Make sure professor has taught within last 2 years
      const lastTermTaught = professorEntry ? professorEntry.recentTerms[0] : null;
      return lastTermTaught && termWithinDays(lastTermTaught, 730);
    })
    .sort((profA, profB) => {
      const profAEval = aggregateCourseEvals[profA] && aggregateCourseEvals[profA][courseCode];
      const profBEval = aggregateCourseEvals[profB] && aggregateCourseEvals[profB][courseCode];

      if (!profAEval || !profBEval) return 0; // Handle cases where data might be missing

      profAEval.qualityAvg = profAEval.qualityTotal / profAEval.qualityCount;
      profAEval.difficultyAvg =
        profAEval.difficultyTotal / profAEval.difficultyCount;
      profAEval.workloadAvg = profAEval.workloadTotal / profAEval.workloadCount;
      profBEval.qualityAvg = profBEval.qualityTotal / profBEval.qualityCount;
      profBEval.difficultyAvg =
        profBEval.difficultyTotal / profBEval.difficultyCount;
      profBEval.workloadAvg = profBEval.workloadTotal / profBEval.workloadCount;
      const scoreA =
        profAEval.qualityAvg +
        (5 - profAEval.difficultyAvg) +
        (15 - profAEval.workloadAvg);
      const scoreB =
        profBEval.qualityAvg +
        (5 - profBEval.difficultyAvg) +
        (15 - profBEval.workloadAvg);
      // Sort by score descending
      return scoreB - scoreA;
    });

  return bestProfs.join(', ');
}

function getHistoricalOfferingSeasons(courseCode) {
  const courseEval = aggregateCourseEvals[courseCode];
  if (!courseEval) {
    return null;
  }
  const offeringSeasons = {};
  for (const professor of courseEval.professors) {
    const professorEntry = aggregateCourseEvals[professor] && aggregateCourseEvals[professor][courseCode];
    if (professorEntry) {
      for (const term of professorEntry.recentTerms) {
        const season = term.split(' ')[0];
        if (termWithinDays(term, 730))
          offeringSeasons[season] = (offeringSeasons[season] || 0) + 1;
      }
    }
  }
  const formattedSeasons = Object.entries(offeringSeasons)
    .map(([season, count]) => `${count} times during ${season}`)
    .join(', ');

  return formattedSeasons ? `in the past 2 years, was offered ${formattedSeasons}.` : 'no recent historical offerings.';
}

function termWithinDays(term, days) {
  const [season, year] = term.split(' ');
  const month =
    season === 'Winter'
      ? 3
      : season === 'Spring'
        ? 6
        : season === 'Summer'
          ? 8
          : 12;

  const dateOfTerm = new Date(
    `${year}-${month}-01`
  );
  const currentQuarterDate = new Date();
  const msPerDay = 86400000;
  const daysSinceTerm =
    (currentQuarterDate - dateOfTerm) / msPerDay;
  return daysSinceTerm <= days;
}


function treeNodeToString(node) {
  switch (node.type) {
    case "courseCode":
      return node.courseCode;

    case "courseCodeRange":
      const min = node.minimumRequired ?? 1;
      const exclusions = node.doNotCount.length > 0
        ? ` excluding [${node.doNotCount.join(", ")}]`
        : "";
      return `${node.courseCodeRange} (min ${min}${exclusions})`;

    case "and":
      return `(${node.children.map(treeNodeToString).join(" AND ")})`;

    case "or":
      const branches = node.children.map(treeNodeToString).join(" OR ");
      const branchReq = node.minBranchesMatched ?? 1;
      const courseReq = node.minTotalCoursesMatched ?? 0;
      return `(${branches}) [minBranchesMatched: ${branchReq}, minTotalCoursesMatched: ${courseReq}]`;

    default:
      return "[Unknown Node]";
  }
}

makeSupabaseDB('full_university_catalog_v2.json');