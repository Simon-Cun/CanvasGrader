(() => {
  // Find all rows with class student_assignment
  const rows = document.querySelectorAll(
    "tr.student_assignment.assignment_graded"
  );

  rows.forEach((row) => {
    const assignmentName = row.querySelector("th.title a")?.innerText.trim();
    const score = row
      .querySelector(".assignment_score .grade")
      ?.innerText.trim();
    const total = row
      .querySelector(".assignment_score span.grade + span")
      ?.innerText.replace("/", "")
      .trim();

    console.log({ assignmentName, score, total });
  });
})();
