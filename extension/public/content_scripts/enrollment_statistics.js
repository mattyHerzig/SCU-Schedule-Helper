// // Check for the Saved Schedule page
// function checkForSavedSchedulePage(observer) {
//     const MultiParameterButton = document.querySelector('[data-automation-id="wd-MultiParameterButton"]'); // Saved Schedule Page
//     if (MultiParameterButton) {
//         console.log('Saved Schedule Page detected.');
//         handleFindEnrollmentStatistics();
//         observer.disconnect();
//     }
// }

// // Initial check
// const observer = new MutationObserver((mutationsList, observer) => checkForSavedSchedulePage(observer));
// observer.observe(document.documentElement, {
//     childList: true,
//     subtree: true,
// });

// async function handleFindEnrollmentStatistics() {
//     console.log('Fetching enrollment statistics...');
//     // Extract the saved schedule ID from the current URL
//     const currentUrl = window.location.href;
//     const savedScheduleIdMatch = currentUrl.match(/\d{5}\$\d{5}/);
//     if (!savedScheduleIdMatch) {
//         console.error('Could not extract saved schedule ID from URL:', currentUrl);
//         return [];
//     }
//     const savedScheduleId = savedScheduleIdMatch[0];
//     const apiUrl = `https://www.myworkday.com/scu/inst/15$369057/${savedScheduleId}.htmld?clientRequestID=f716d24cd63d4b4f8be1172f72d8bf70`;

//     try {
//         // Step 1: Fetch the initial list of courses
//         const response = await fetch(apiUrl, {
//             method: "GET",
//             headers: {
//                 "accept": "application/json",
//                 "accept-language": "en-US,en;q=0.9",
//                 "content-type": "application/x-www-form-urlencoded",
//                 "sec-fetch-dest": "empty",
//                 "sec-fetch-mode": "cors",
//                 "sec-fetch-site": "same-origin",
//                 "Referer": currentUrl,
//                 "Referrer-Policy": "strict-origin-when-cross-origin"
//             },
//             credentials: "include"
//         });

//         if (!response.ok) {
//             console.error('Failed to fetch course data:', response.statusText);
//             return [];
//         }

//         const data = await response.json();
        
//         // Step 2: Find the course sections under the "162.1" key
//         const coursesData = data?.body?.children?.[6]?.rows; // 6 is for the 7th child (zero-based index)
//         let courseSections = [];

//         // Iterate over each row to find '162.1' in cellMap
//         coursesData?.forEach(row => {
//             const courseSection = row.cellsMap?.["162.1"];
//             if (courseSection) {
//                 const match = courseSection.selfUriTemplate.match(/15\$(\d+\/\d+\$\d+)/);
//                 if (match) {
//                     courseSections.push(match[0]);
//                 }
//             }
//         });

//         if (!courseSections || !Array.isArray(courseSections)) {
//             console.error('No course sections found in the response.');
//             return [];
//         }

//         // Step 3: Create an array to hold courses with their enrollment data
//         const coursesWithStats = [];

//         // Step 4: Iterate through the course sections
//         for (const courseSection of courseSections) {
//             const sectionUrl = `https://www.myworkday.com/scu/inst/${courseSection}.htmld?clientRequestID=c087109c484c4df2846d9904b5cad947`;

//             try {
//                 // Step 5: Fetch the Enrolled/Capacity data for each course section
//                 const sectionResponse = await fetch(sectionUrl, {
//                     method: "GET",
//                     headers: {
//                         "accept": "*/*",
//                         "accept-language": "en-US,en;q=0.9",
//                         "content-type": "application/x-www-form-urlencoded",
//                         "sec-fetch-dest": "empty",
//                         "sec-fetch-mode": "cors",
//                         "sec-fetch-site": "same-origin",
//                         "Referer": `https://www.myworkday.com/scu/inst/${courseSection}.htmld?clientRequestID=c087109c484c4df2846d9904b5cad947`,
//                         "Referrer-Policy": "strict-origin-when-cross-origin"
//                     },
//                     credentials: "include" 
//                 });

//                 if (!sectionResponse.ok) {
//                     console.error('Failed to fetch section data:', sectionResponse.statusText);
//                     continue;
//                 }

//                 const sectionData = await sectionResponse.json();
                
//                 // Step 6: Extract the Enrolled/Capacity data
//                 const enrolledStats = sectionData?.body?.children?.[0]?.children?.[1]?.children?.find(child => child.label === "Enrolled/Capacity")?.value;

//                 // Step 7: Organize the data into an object
//                 if (enrolledStats) {
//                     const courseInfo = {
//                         courseSection: courseSection,
//                         enrolledStats: enrolledStats
//                     };
//                     coursesWithStats.push(courseInfo);
//                 }

//             } catch (error) {
//                 console.error('Error fetching section data:', error);
//             }
//         }

//         console.log('Enrollment statistics fetched:', coursesWithStats);
//         return coursesWithStats; // Return the array of courses with stats

//     } catch (error) {
//         console.error('Error fetching course data:', error);
//         return [];
//     }
// }

