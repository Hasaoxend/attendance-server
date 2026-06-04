function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function canStudentJoinEvent(student, event) {
  const studentFaculty = normalizeValue(student?.faculty);
  const studentInstitute = normalizeValue(student?.institute);
  const allowedFaculty = normalizeValue(event?.allowed_faculty);
  const allowedInstitute = normalizeValue(event?.allowed_institute);

  const facultyOk = !allowedFaculty || studentFaculty === allowedFaculty;
  const instituteOk = !allowedInstitute || studentInstitute === allowedInstitute;

  return facultyOk && instituteOk;
}

module.exports = {
  canStudentJoinEvent,
};
