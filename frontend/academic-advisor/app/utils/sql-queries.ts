import sqlite3 from "sqlite3"

let db: sqlite3.Database | null = null

export async function initializeDatabase() {
  if (!db) {
    try {
      db = new sqlite3.Database("./data/university_catalog.db", (err) => {
        if (err) {
          console.error("Error opening SQLite database:", err)
          throw err
        }
      })
      console.log("SQLite database initialized successfully")
    } catch (error) {
      console.error("Error initializing SQLite database:", error)
      throw error
    }
  }
  return db
}

export async function runSQLQuery(query: string, params: any[] = []) {
  try {
    const database = await initializeDatabase()
    database.all(query, params, (err, rows) => {
      if (err) {
        console.error("SQL Error:", err)
        throw err
      }
      console.log(`SQL query executed: ${query}`)
      console.log(`Result rows:`, rows)
      return rows;
    })
  } catch (error) {
    console.error("SQL Error:", error)
    return [];
  }
}

// Helper functions for common queries

export async function getCourseByCode(courseCode: string) {
  return runSQLQuery("SELECT * FROM Courses WHERE courseCode = ?", [courseCode])
}

export async function getMajorByName(majorName: string) {
  return runSQLQuery("SELECT * FROM Majors WHERE name = ?", [majorName])
}

export async function getMinorByName(minorName: string) {
  return runSQLQuery("SELECT * FROM Minors WHERE name = ?", [minorName])
}

export async function getEmphasisByName(emphasisName: string) {
  return runSQLQuery("SELECT * FROM Emphases WHERE name = ?", [emphasisName])
}

export async function searchCourses(searchTerm: string) {
  return runSQLQuery("SELECT * FROM Courses WHERE courseCode LIKE ? OR name LIKE ? LIMIT 20", [
    `%${searchTerm}%`,
    `%${searchTerm}%`,
  ])
}

export async function getPrerequisitesForCourse(courseCode: string) {
  return runSQLQuery("SELECT prerequisiteCourses FROM Courses WHERE courseCode = ?", [courseCode])
}

export async function getCoreRequirements() {
  return runSQLQuery("SELECT * FROM CoreCurriculumRequirements")
}

export async function getPathways() {
  return runSQLQuery("SELECT * FROM CoreCurriculumPathways")
}
