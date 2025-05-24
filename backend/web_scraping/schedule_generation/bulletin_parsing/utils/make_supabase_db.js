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

  // --- Create Tables (via SQL in Supabase Dashboard or Migrations) ---
  // Supabase tables are typically created using SQL in the Supabase Dashboard
  // or through database migrations. For this example, we'll assume the tables
  // are already created in your Supabase project with the following schemas:
  /*
  CREATE TABLE Schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    courseRequirementsExpression TEXT,
    unitRequirements JSONB,
    otherRequirements JSONB,
    src TEXT
  );

  CREATE TABLE DeptsAndPrograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    majors TEXT, -- Storing as comma-separated string for simplicity
    minors TEXT, -- Storing as comma-separated string for simplicity
    emphases TEXT, -- Storing as comma-separated string for simplicity
    school TEXT,
    src TEXT
  );

  CREATE TABLE Majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    deptCode TEXT,
    requiresEmphasis BOOLEAN,
    courseRequirementsExpression TEXT,
    unitRequirements JSONB,
    otherRequirements JSONB,
    otherNotes TEXT,
    src TEXT
  );

  CREATE TABLE Minors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    deptCode TEXT,
    requiresEmphasis BOOLEAN,
    courseRequirementsExpression TEXT,
    unitRequirements JSONB,
    otherRequirements JSONB,
    otherNotes TEXT,
    src TEXT
  );

  CREATE TABLE Emphases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    appliesTo TEXT,
    nameOfWhichItAppliesTo TEXT,
    deptCode TEXT,
    courseRequirementsExpression TEXT,
    unitRequirements JSONB,
    otherRequirements JSONB,
    otherNotes TEXT,
    src TEXT
  );

  CREATE TABLE SpecialPrograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    courseRequirementsExpression TEXT,
    unitRequirements JSONB,
    otherRequirements JSONB,
    src TEXT
  );

  CREATE TABLE Courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    courseCode TEXT,
    name TEXT,
    description TEXT,
    numUnits INTEGER,
    prerequisiteCourses TEXT,
    corequisiteCourses TEXT,
    otherRequirements JSONB,
    otherNotes TEXT,
    offeringSchedule TEXT,
    nextQuarterOfferings JSONB,
    historicalBestProfessors TEXT,
    fulfillsCoreRequirements TEXT,
    src TEXT
  );

  CREATE TABLE CoreCurriculumRequirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    appliesTo TEXT,
    fulfilledBy JSONB,
    src TEXT
  );

  CREATE TABLE CoreCurriculumPathways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    associatedCourses JSONB,
    src TEXT
  );
  */
  // Note: We've added an 'id UUID PRIMARY KEY DEFAULT uuid_generate_v4()' to each table
  // as a best practice for Supabase/PostgreSQL.

  console.log('Inserting data into Supabase...');

  // Helper for inserting data and handling errors
  const insertData = async (tableName, data) => {
    const { error } = await supabase.from(tableName).insert(data);
    if (error) {
      console.error(`Error inserting into ${tableName}:`, error);
    }
  };

  for (const school of catalog.schools) {
    await insertData('Schools', {
      name: school.name,
      description: school.description,
      courseRequirementsExpression: school.courseRequirementsExpression,
      unitRequirements: school.unitRequirements, // Supabase JSONB handles objects directly
      otherRequirements: school.otherRequirements, // Supabase JSONB handles objects directly
      src: school.src,
    });
  }
  console.log('Schools inserted.');

  for (const deptOrProgram of catalog.deptsAndPrograms) {
    await insertData('DeptsAndPrograms', {
      name: deptOrProgram.name,
      description: deptOrProgram.description,
      majors: deptOrProgram.majors.map((major) => major.name).join(', '),
      minors: deptOrProgram.minors.map((minor) => minor.name).join(', '),
      emphases: deptOrProgram.emphases.map((emphasis) => emphasis.name).join(', '),
      school: deptOrProgram.school,
      src: deptOrProgram.src,
    });

    for (const major of deptOrProgram.majors) {
      await insertData('Majors', {
        name: major.name,
        description: major.description,
        deptCode: major.departmentCode,
        requiresEmphasis: major.requiresEmphasis, // Boolean directly
        courseRequirementsExpression: major.courseRequirementsExpression,
        unitRequirements: major.unitRequirements,
        otherRequirements: major.otherRequirements,
        otherNotes: major.otherNotes.join('\n'),
        src: major.src,
      });
    }
    for (const minor of deptOrProgram.minors) {
      await insertData('Minors', {
        name: minor.name,
        description: minor.description,
        deptCode: minor.departmentCode,
        requiresEmphasis: minor.requiresEmphasis,
        courseRequirementsExpression: minor.courseRequirementsExpression,
        unitRequirements: minor.unitRequirements,
        otherRequirements: minor.otherRequirements,
        otherNotes: minor.otherNotes.join('\n'),
        src: minor.src,
      });
    }
    for (const emphasis of deptOrProgram.emphases) {
      await insertData('Emphases', {
        name: emphasis.name,
        description: emphasis.description,
        appliesTo: emphasis.appliesTo,
        nameOfWhichItAppliesTo: emphasis.nameOfWhichItAppliesTo,
        deptCode: emphasis.departmentCode,
        courseRequirementsExpression: emphasis.courseRequirementsExpression,
        unitRequirements: emphasis.unitRequirements,
        otherRequirements: emphasis.otherRequirements,
        otherNotes: emphasis.otherNotes.join('\n'),
        src: emphasis.src,
      });
    }
  }
  console.log('DeptsAndPrograms, Majors, Minors, Emphases inserted.');


  for (const specialProgram of catalog.specialPrograms) {
    await insertData('SpecialPrograms', {
      name: specialProgram.name,
      description: specialProgram.description,
      courseRequirementsExpression: specialProgram.courseRequirementsExpression,
      unitRequirements: specialProgram.unitRequirements,
      otherRequirements: specialProgram.otherRequirements,
      src: specialProgram.src,
    });
  }
  console.log('SpecialPrograms inserted.');

  for (const course of catalog.courses) {
    let offeringSchedule = `Expected schedule: ${course.otherOfferingSchedule || course.offeringSchedule}; historically, ${getHistoricalOfferingSeasons(course.courseCode)}`;
    const fulfillsCoreRequirements = Array.from(new Set(catalog.coreCurriculum.requirements.filter(
      (req) =>
        req.fulfilledBy &&
        req.fulfilledBy.includes(course.courseCode)
    ).map((req) => `"${req.requirementName}"`)));

    await insertData('Courses', {
      courseCode: course.courseCode,
      name: course.name,
      description: course.description,
      numUnits: course.numUnits,
      prerequisiteCourses: course.prerequisiteCourses,
      corequisiteCourses: course.corequisiteCourses,
      otherRequirements: course.otherRequirements,
      otherNotes: course.otherNotes,
      offeringSchedule: offeringSchedule,
      nextQuarterOfferings: course.nextQuarterOfferings,
      historicalBestProfessors: getHistoricalBestProfessors(course.courseCode),
      fulfillsCoreRequirements: fulfillsCoreRequirements.length > 0
        ? fulfillsCoreRequirements.join(', ')
        : null,
      src: course.src,
    });
  }
  console.log('Courses inserted.');

  for (const coreCurriculumRequirement of catalog.coreCurriculum.requirements) {
    await insertData('CoreCurriculumRequirements', {
      name: coreCurriculumRequirement.requirementName,
      description: coreCurriculumRequirement.requirementDescription,
      appliesTo: coreCurriculumRequirement.appliesTo,
      fulfilledBy: coreCurriculumRequirement.fulfilledBy, // JSONB handles arrays directly
      src: coreCurriculumRequirement.src,
    });
  }
  console.log('CoreCurriculumRequirements inserted.');

  for (const coreCurriculumPathway of catalog.coreCurriculum.pathways) {
    await insertData('CoreCurriculumPathways', {
      name: coreCurriculumPathway.name,
      description: coreCurriculumPathway.description,
      associatedCourses: coreCurriculumPathway.associatedCourses, // JSONB handles arrays directly
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

makeSupabaseDB('full_university_catalog_v2.json');