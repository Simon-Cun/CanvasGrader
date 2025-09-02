const getGradesBtn = document.getElementById("getGrades");
const gradesTable = document.getElementById("gradesTable");
const finalGrade = document.getElementById("finalGrade");
const newGroupInput = document.getElementById("newGroupName");
const addGroupBtn = document.getElementById("addGroup");
const groupControls = document.getElementById("groupControls");

let groups = {}; // { groupName: [assignments] }

getGradesBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript(
    { target: { tabId: tab.id }, function: scrapeGrades },
    (results) => {
      if (results?.[0]?.result?.length > 0) {
        groups = {};
        results[0].result.forEach((g) => {
          const ctx = g.context || "Other";
          if (!groups[ctx]) groups[ctx] = [];
          groups[ctx].push({
            name: g.assignmentName,
            score: g.score,
            total: g.total,
          });
        });

        // Show Add Group section once grades are fetched
        groupControls.style.display = "block";
        renderTable();
      } else {
        alert("No grades found on this page.");
      }
    }
  );
});

addGroupBtn.addEventListener("click", () => {
  const groupName = newGroupInput.value.trim();
  if (!groupName || groups[groupName]) return;
  groups[groupName] = [];
  renderTable();
  newGroupInput.value = "";
});

function scrapeGrades() {
  const rows = document.querySelectorAll(
    "tr.student_assignment.assignment_graded"
  );
  return Array.from(rows).map((row) => {
    const assignmentName = row.querySelector("th.title a")?.innerText.trim();
    const context =
      row.querySelector("th.title .context")?.innerText.trim() || "Other";

    const gradeSpan = row.querySelector(".assignment_score .grade");
    let score = null;
    if (gradeSpan) {
      const match = gradeSpan.textContent.match(/(\d+(\.\d+)?)(?!.*\d)/);
      if (match) score = parseFloat(match[0]);
    }

    let total = null;
    if (gradeSpan?.nextElementSibling) {
      total = parseFloat(
        gradeSpan.nextElementSibling.textContent.replace("/", "").trim()
      );
    }

    return { assignmentName, context, score, total };
  });
}

function renderTable() {
  gradesTable.innerHTML = "";
  Object.keys(groups).forEach((groupName) => {
    const groupRow = document.createElement("tr");
    groupRow.innerHTML = `
      <th colspan="4" style="text-align:left; background:#eee;">
        ${groupName} - Weight (%): <input type="number" class="group-weight" value="0" min="0" max="100">
      </th>
    `;
    gradesTable.appendChild(groupRow);

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>Assignment</th>
      <th>Score</th>
      <th>Total</th>
      <th>Move To</th>
    `;
    gradesTable.appendChild(headerRow);

    groups[groupName].forEach((assignment, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="text" class="assignment-name" value="${
          assignment.name
        }"></td>
        <td><input type="number" class="score" value="${
          assignment.score ?? ""
        }" min="0"></td>
        <td><input type="number" class="total" value="${
          assignment.total ?? ""
        }" min="0"></td>
        <td>
          <select class="move-group">
            <option value="">--Move--</option>
            ${Object.keys(groups)
              .filter((g) => g !== groupName)
              .map((g) => `<option value="${g}">${g}</option>`)
              .join("")}
          </select>
        </td>
      `;
      gradesTable.appendChild(row);

      row
        .querySelector(".assignment-name")
        .addEventListener("input", (e) => (assignment.name = e.target.value));
      row.querySelector(".score").addEventListener("input", (e) => {
        assignment.score = parseFloat(e.target.value);
        calculateFinalGrade();
      });
      row.querySelector(".total").addEventListener("input", (e) => {
        assignment.total = parseFloat(e.target.value);
        calculateFinalGrade();
      });
      row.querySelector(".move-group").addEventListener("change", (e) => {
        const newGroup = e.target.value;
        if (!newGroup) return;
        groups[newGroup].push(assignment);
        groups[groupName].splice(index, 1);
        renderTable();
      });
    });
  });

  document.querySelectorAll(".group-weight").forEach((input) => {
    input.addEventListener("input", calculateFinalGrade);
  });

  calculateFinalGrade();
}

function calculateFinalGrade() {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.keys(groups).forEach((groupName, idx) => {
    const groupWeight =
      parseFloat(gradesTable.querySelectorAll(".group-weight")[idx].value) || 0;

    let groupSum = 0;
    let groupTotal = 0;

    groups[groupName].forEach((assignment) => {
      let score = assignment.score;
      let total = assignment.total;
      if (score == null && total != null) score = total;
      if (!isNaN(score) && !isNaN(total) && total > 0) {
        groupSum += score;
        groupTotal += total;
      }
    });

    if (groupTotal > 0) {
      totalWeightedScore += (groupSum / groupTotal) * groupWeight;
      totalWeight += groupWeight;
    }
  });

  finalGrade.innerText =
    totalWeight > 0
      ? `Final Grade: ${((totalWeightedScore / totalWeight) * 100).toFixed(2)}%`
      : "Enter weights to calculate grade.";
}
