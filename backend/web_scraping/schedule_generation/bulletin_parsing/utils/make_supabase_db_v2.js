import pg from 'pg';
import fs from 'fs';

// Load data from JSON files
const aggregateCourseEvalsFile = './local_data/aggregate_evals.json';
const aggregateCourseEvals = JSON.parse(
    fs.readFileSync(aggregateCourseEvalsFile, 'utf-8')
);


const connectionString = process.env.CONNECTION_STRING;

if (!connectionString) {
    console.error('CONNECTION_STRING must be set in your .env file');
    process.exit(1);
}

const client = new pg.Client({ connectionString });

function treeNodeToString(node) {
    if (!node) return null; // Handle cases where node might be undefined
    switch (node.type) {
        case "empty":
            return "No requirements encoded.";
        case "courseCode":
            return node.courseCode;
        case "courseCodeRange":
            const min = node.minimumRequired ?? 1;
            const exclusions = node.doNotCount && node.doNotCount.length > 0
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
            console.warn(`[Unknown Node Type]: ${node.type}`, node);
            return "[Unknown Node]";
    }
}

function termWithinDays(term, days) {
    if (!term) return false;
    const [season, yearStr] = term.split(' ');
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) return false;

    const month =
        season === 'Winter'
            ? 3 // Approx end of Winter quarter
            : season === 'Spring'
                ? 6 // Approx end of Spring quarter
                : season === 'Summer'
                    ? 8 // Approx end of Summer session
                    : 12; // Approx end of Fall quarter

    // Use the first day of the month following the quarter for comparison
    // to ensure the term itself is included.
    const termEndDate = new Date(year, month, 1); // month is 0-indexed for Date constructor

    const currentDate = new Date();
    const msPerDay = 86400000;
    // Check if current date is past 'days' from the term's approximate end
    const daysSinceTermEnd = (currentDate - termEndDate) / msPerDay;

    return daysSinceTermEnd <= days;
}


function getHistoricalBestProfessors(courseCode) {
    const courseEvalData = aggregateCourseEvals[courseCode];
    if (!courseEvalData || !courseEvalData.professors) {
        return null;
    }

    const bestProfs = courseEvalData.professors
        .map(profName => ({ name: profName, data: aggregateCourseEvals[profName]?.[courseCode] }))
        .filter(prof => {
            if (!prof.data || !prof.data.recentTerms || prof.data.recentTerms.length === 0) return false;
            // Make sure professor has taught within last 2 years (730 days)
            const lastTermTaught = prof.data.recentTerms[0];
            return termWithinDays(lastTermTaught, 730);
        })
        .map(prof => {
            // Calculate averages if counts are not zero
            const qualityAvg = prof.data.qualityCount > 0 ? prof.data.qualityTotal / prof.data.qualityCount : 0;
            const difficultyAvg = prof.data.difficultyCount > 0 ? prof.data.difficultyTotal / prof.data.difficultyCount : 0;
            const workloadAvg = prof.data.workloadCount > 0 ? prof.data.workloadTotal / prof.data.workloadCount : 0;

            const score = qualityAvg + (5 - difficultyAvg) + (15 - workloadAvg);
            return { name: prof.name, score };
        })
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .map(prof => prof.name);

    return bestProfs.length > 0 ? bestProfs.join(', ') : null;
}

function getHistoricalOfferingSeasons(courseCode) {
    const courseEvalData = aggregateCourseEvals[courseCode];
    if (!courseEvalData || !courseEvalData.professors) {
        return null;
    }

    const offeringSeasons = {};
    for (const professorName of courseEvalData.professors) {
        const professorCourseEntry = aggregateCourseEvals[professorName]?.[courseCode];
        if (professorCourseEntry && professorCourseEntry.recentTerms) {
            for (const term of professorCourseEntry.recentTerms) {
                if (termWithinDays(term, 730)) { // within the last 2 years
                    const season = term.split(' ')[0];
                    offeringSeasons[season] = (offeringSeasons[season] || 0) + 1;
                }
            }
        }
    }

    const formattedSeasons = Object.entries(offeringSeasons)
        .map(([season, count]) => `${count} time${count > 1 ? 's' : ''} during ${season}`)
        .join(', ');

    return formattedSeasons ? `in the past 2 years, was offered ${formattedSeasons}.` : 'no recent historical offerings.';
}


// --- Schema Definition ---
const dropTableStatements = [
    "DROP TABLE IF EXISTS Courses CASCADE;", // CASCADE drops dependent objects
    "DROP TABLE IF EXISTS CoreCurriculumRequirements CASCADE;",
    "DROP TABLE IF EXISTS CoreCurriculumPathways CASCADE;",
    "DROP TABLE IF EXISTS Emphases CASCADE;",
    "DROP TABLE IF EXISTS SpecialPrograms CASCADE;",
    "DROP TABLE IF EXISTS Minors CASCADE;",
    "DROP TABLE IF EXISTS Majors CASCADE;",
    "DROP TABLE IF EXISTS DeptsAndPrograms CASCADE;",
    "DROP TABLE IF EXISTS Schools CASCADE;",
];

const createTableStatements = [
    `CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    courserequirementsexpression TEXT,
    unitrequirements TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    src TEXT
  );`,
    `CREATE TABLE deptsandprograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    majors TEXT,
    minors TEXT,
    emphases TEXT,
    school TEXT,
    src TEXT
  );`,
    `CREATE TABLE majors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    deptcode TEXT,
    requiresemphasis BOOLEAN,
    courserequirementsexpression TEXT,
    unitrequirements TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    src TEXT
  );`,
    `CREATE TABLE minors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    deptcode TEXT,
    requiresemphasis BOOLEAN,
    courserequirementsexpression TEXT,
    unitrequirements TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    src TEXT
  );`,
    `CREATE TABLE emphases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    appliesto TEXT,
    nameofwhichitappliesto TEXT,
    deptcode TEXT,
    courserequirementsexpression TEXT,
    unitrequirements TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    src TEXT
  );`,
    `CREATE TABLE specialprograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    courserequirementsexpression TEXT,
    unitrequirements TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    src TEXT
  );`,
    `CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coursecode TEXT UNIQUE, -- Added UNIQUE constraint as course codes should be unique
    name TEXT,
    description TEXT,
    numunits TEXT,
    prerequisitecourses TEXT,
    corequisitecourses TEXT,
    otherrequirements TEXT,
    othernotes TEXT,
    offeringschedule TEXT,
    nextquarterofferings TEXT,
    historicalbestprofessors TEXT,
    fulfillscorerequirements TEXT, -- Storing as comma-separated text
    src TEXT
  );`,
    `CREATE TABLE corecurriculumrequirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    appliesto TEXT,
    fulfilledby TEXT,
    src TEXT
  );`,
    `CREATE TABLE corecurriculumpathways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    associatedcourses TEXT,
    src TEXT
  );`
];

async function setupDatabaseSchema() {
    console.log('Setting up database schema...');
    try {
        // Enable UUID generation extension if not already enabled
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        console.log('Ensured "uuid-ossp" extension exists.');

        // Drop tables
        for (const dropStatement of dropTableStatements) {
            await client.query(dropStatement);
            // console.log(`Executed: ${dropStatement.split(' ')[3]}`); // Logs which table was dropped
        }
        console.log('All tables dropped successfully (if they existed).');

        // Create tables
        for (const createStatement of createTableStatements) {
            await client.query(createStatement);
            // console.log(`Executed: CREATE TABLE ${createStatement.match(/CREATE TABLE\s*(\w+)/i)[1]}`);
        }
        console.log('All tables created successfully.');
        console.log('Database schema setup complete.');
    } catch (error) {
        console.error('Error setting up database schema:', error);
        throw error; // Re-throw to stop script execution if schema setup fails
    }
}

async function makePostgresDB(catalogJsonFilename) {
    const catalog = JSON.parse(
        fs.readFileSync(`./local_data/${catalogJsonFilename}`, 'utf-8')
    );

    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected.');

    await setupDatabaseSchema();

    // Helper for inserting data and handling errors using raw SQL
    const insertData = async (tableName, data) => {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        // Ensure column names are properly quoted if they might contain special characters or match keywords
        // Though for this schema, direct use is likely fine.
        const columnNames = columns.join(', ');

        const sql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`;
        try {
            await client.query(sql, values);
        } catch (error) {
            console.error(`Error inserting into ${tableName} with data:`, data);
            console.error('SQL:', sql);
            console.error('Values:', values);
            console.error('Error:', error.message); // Log specific error message
            // Consider re-throwing or specific handling if one error should stop the whole script
        }
    };

    for (const school of catalog.schools) {
        await insertData('schools', {
            name: school.name,
            description: school.description,
            courserequirementsexpression: treeNodeToString(school.courseRequirements.tree),
            unitrequirements: JSON.stringify(school.unitRequirements, null, 2),
            otherrequirements: JSON.stringify(school.courseRequirements?.thingsNotEncoded, null, 2),
            othernotes: JSON.stringify(school.otherNotes, null, 2),
            src: school.src,
        });
    }
    console.log('Schools inserted.');

    for (const deptOrProgram of catalog.deptsAndPrograms) {
        await insertData('deptsandprograms', {
            name: deptOrProgram.name,
            description: deptOrProgram.description,
            majors: deptOrProgram.majors?.map((major) => major.name).join(', '),
            minors: deptOrProgram.minors?.map((minor) => minor.name).join(', '),
            emphases: deptOrProgram.emphases?.map((emphasis) => emphasis.name).join(', '),
            school: deptOrProgram.school,
            src: deptOrProgram.src,
        });

        for (const major of deptOrProgram.majors) {
            await insertData('majors', {
                name: major.name,
                description: major.description,
                deptcode: major.departmentCode,
                requiresemphasis: major.requiresEmphasis, // Boolean
                courserequirementsexpression: treeNodeToString(major.courseRequirements.tree),
                unitrequirements: JSON.stringify(major.unitRequirements, null, 2),
                otherrequirements: JSON.stringify(major.courseRequirements.thingsNotEncoded, null, 2),
                othernotes: JSON.stringify(major.otherNotes, null, 2),
                src: major.src,
            });
        }
        for (const minor of deptOrProgram.minors) {
            await insertData('minors', {
                name: minor.name,
                description: minor.description,
                deptcode: minor.departmentCode,
                requiresemphasis: minor.requiresEmphasis,
                courserequirementsexpression: treeNodeToString(minor.courseRequirements.tree),
                unitrequirements: JSON.stringify(minor.unitRequirements, null, 2),
                otherrequirements: JSON.stringify(minor.courseRequirements.thingsNotEncoded, null, 2),
                othernotes: JSON.stringify(minor.otherNotes, null, 2),
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
                courserequirementsexpression: treeNodeToString(emphasis.courseRequirements.tree),
                unitrequirements: JSON.stringify(emphasis.unitRequirements, null, 2),
                otherrequirements: JSON.stringify(emphasis.courseRequirements?.thingsNotEncoded, null, 2),
                othernotes: JSON.stringify(emphasis.otherNotes, null, 2),
                src: emphasis.src,
            });
        }
    }
    console.log('DeptsAndPrograms, Majors, Minors, Emphases inserted.');

    for (const specialProgram of catalog.specialPrograms) {
        await insertData('specialprograms', {
            name: specialProgram.name,
            description: specialProgram.description,
            courserequirementsexpression: treeNodeToString(specialProgram.courseRequirements.tree),
            unitrequirements: JSON.stringify(specialProgram.unitRequirements, null, 2),
            otherrequirements: JSON.stringify(specialProgram.courseRequirements.thingsNotEncoded, null, 2),
            othernotes: JSON.stringify(specialProgram.otherNotes, null, 2),
            src: specialProgram.src,
        });
    }
    console.log('SpecialPrograms inserted.');

    for (const course of catalog.courses) {
        const offeringSchedule = `Expected schedule: ${course.otherOfferingSchedule || course.offeringSchedule || 'N/A'}; historically, ${getHistoricalOfferingSeasons(course.courseCode) || 'data not available'}`;
        if (getHistoricalBestProfessors(course.courseCode) === null)
            // This course has never been taught, skip it
            continue;
        const fulfillscorerequirementsArray = Array.from(new Set(catalog.coreCurriculum.requirements.filter(
            (req) =>
                req.fulfilledBy &&
                req.fulfilledBy.includes(course.courseCode)
        ).map((req) => req.requirementName))); // Store names directly, not quoted strings

        await insertData('courses', {
            coursecode: course.courseCode,
            name: course.name,
            description: course.description,
            numunits: course.numUnits,
            prerequisitecourses: course.prerequisiteCourses, // Assuming TEXT
            corequisitecourses: course.corequisiteCourses, // Assuming TEXT
            otherrequirements: JSON.stringify(course.otherRequirements, null, 2),
            othernotes: course.otherNotes, // Assuming TEXT
            offeringschedule: offeringSchedule,
            nextquarterofferings: JSON.stringify(course.nextQuarterOfferings, null, 2),
            historicalbestprofessors: getHistoricalBestProfessors(course.courseCode),
            fulfillscorerequirements: fulfillscorerequirementsArray.length > 0
                ? fulfillscorerequirementsArray.join(', ') // Storing as comma-separated TEXT
                : null,
            src: course.src,
        });
    }
    console.log('Courses inserted.');

    for (const coreCurriculumRequirement of catalog.coreCurriculum.requirements) {
        const fulfilledBy = coreCurriculumRequirement.fulfilledBy.filter(
            (courseCode) => getHistoricalBestProfessors(courseCode) !== null
        ) // Filter out courses that have never been taught.
        await insertData('corecurriculumrequirements', {
            name: coreCurriculumRequirement.requirementName,
            description: coreCurriculumRequirement.requirementDescription,
            appliesto: coreCurriculumRequirement.appliesTo,
            fulfilledby: JSON.stringify(fulfilledBy, null, 2),
            src: coreCurriculumRequirement.src,
        });
    }
    console.log('CoreCurriculumRequirements inserted.');

    for (const coreCurriculumPathway of catalog.coreCurriculum.pathways) {
        await insertData('corecurriculumpathways', {
            name: coreCurriculumPathway.name,
            description: coreCurriculumPathway.description,
            associatedcourses: JSON.stringify(coreCurriculumPathway.associatedCourses, null, 2),
            src: coreCurriculumPathway.src,
        });
    }
    console.log('CoreCurriculumPathways inserted.');

    console.log('All data inserted into PostgreSQL!');
    await client.end();
    console.log('Connection closed.');
}

// Ensure you have the catalog JSON file in the correct path
makePostgresDB('full_university_catalog_v2.json')
    .catch(err => {
        console.error("Error in script execution:", err);
        if (client) { // Attempt to close client if an error occurred after connection
            client.end().catch(closeErr => console.error("Error closing client:", closeErr));
        }
        process.exit(1);
    });