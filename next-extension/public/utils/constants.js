const prodServerUrl = "https://api.scu-schedule-helper.me";
export const prodUserEndpoint = `${prodServerUrl}/user`;
export const prodAuthTokenEndpoint = `${prodServerUrl}/auth_token`;
export const prodEvalsEndpoint = `${prodServerUrl}/evals`;
export const courseTakenPattern = /P{(.*?)}C{(.*?)}T{(.*?)}/; // P{profName}C{courseCode}T{termName}
export const interestedSectionPattern = /P{(.*?)}S{(.*?)}M{(.*?)}/; // P{profName}S{full section string}M{meetingPattern}E{expirationTimestamp}
export const workdayCurrentCoursesUrl = "https://www.myworkday.com/scu/d/task/2998$28771.htmld";
export const workdayCourseHistoryUrl = "https://www.myworkday.com/scu/d/task/2998$30300.htmld";