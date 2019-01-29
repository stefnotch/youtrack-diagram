// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const yt = require("youtrack-rest-client");
//const org = require("orgchart");
const usernameAndPassword = require("./js/pw");

/**@type {HTMLHeadingElement} */
const headerElement = document.getElementById("HeaderElement");

/**@type {HTMLInputElement} */
const usernameInput = document.getElementById("UsernameInput");
/**@type {HTMLInputElement} */
const passwordInput = document.getElementById("PasswordInput");
/**@type {HTMLButtonElement} */
const loginButton = document.getElementById("LoginButton");

/**@type {HTMLSelectElement} */
const youtrackProjectsSelect = document.getElementById(
  "YoutrackProjectsSelect"
);
/**@type {HTMLInputElement} */
const ignoreUserStoriesCheckbox = document.getElementById(
  "IgnoreUserStoriesCheckbox"
);

/**@type {HTMLUListElement} */
const issuesList = document.getElementById("IssuesList");

usernameInput.value = usernameAndPassword.username;
passwordInput.value = usernameAndPassword.password;

loginButton.addEventListener("click", ev => {
  const config = {
    baseUrl: "http://vm81.htl-leonding.ac.at:8080/", //"http://10.191.112.81:8080",
    login: usernameInput.value,
    password: passwordInput.value
  };
  const youtrack = new yt.Youtrack(config);

  youtrack.login().then(() => {
    // do some requests..
    youtrack.users.current().then(currentUser => {
      headerElement.innerText = currentUser.fullName;

      youtrackProjectsSelect.innerHTML = "";
      // Main code
      youtrack.projects.all().then(projects => {
        projects.forEach(project => {
          let projectOption = document.createElement("option");
          projectOption.innerText = project.name;
          projectOption.value = project.name;
          youtrackProjectsSelect.appendChild(projectOption);
        });
      });

      youtrackProjectsSelect.addEventListener("change", ev => {
        let selected =
          youtrackProjectsSelect.options[youtrackProjectsSelect.selectedIndex]
            .value;

        issuesList.innerHTML = "";

        youtrack.issues
          .search("project: " + selected, { max: 1000 })
          .then(issues => {
            let datasource = {
              name: selected,
              className: "Sprint"
            };
            let sprintIssues = {};

            issues.forEach(issue => {
              // Leonie Basic Dancing
              let issueName = getIssueField(issue, "summary");
              // Leonie should be able to dance
              let issueDescription = getIssueField(issue, "description");
              // Done
              let issueState = getIssueField(issue, "State");
              if (issueState) issueState = issueState[0];
              // User Story
              let issueType = getIssueField(issue, "Type");
              if (issueType) issueType = issueType[0];

              // Optionally ignroe user stories
              if (
                issueType == "User Story" &&
                ignoreUserStoriesCheckbox.checked
              ) {
                return;
              }

              // Initial Sprint
              let sprintName = getIssueField(issue, "Sprints");
              if (sprintName) sprintName = sprintName[0];

              // TODO: Chances are that an issue can be in multiple sprints...uh..
              let issueElement = document.createElement("li");
              issueElement.innerText =
                issueName +
                ":" +
                issueDescription +
                ":" +
                issueState +
                ":" +
                issueType +
                ":" +
                sprintName;
              console.log(issue);
              // Debugging output:
              //issuesList.appendChild(issueElement);

              //TODO: User stories (See YouTrack - kinda like swimlanes) are usually unfinished, even if all the tasks are done!
              if (!sprintIssues[sprintName]) {
                sprintIssues[sprintName] = {
                  name: sprintName,
                  className: "Sprint",
                  children: []
                };
              }
              sprintIssues[sprintName].children.push({
                name: issueName,
                className: issueState.replace(/\s/g, "")
              });
            });
            datasource.children = Object.keys(sprintIssues).map(
              iss => sprintIssues[iss]
            );
            showChart(datasource);
          });
      });
    });
  });
});

function getIssueField(issue, fieldName) {
  if (!issue) return null;
  if (!issue.field) return null;
  let issueField = issue.field.find(f => f.name == fieldName);
  if (!issueField) return null;
  return issueField.value;
}

function showChart(datasource) {
  $(function() {
    var datascource = {
      name: "Lao Lao",
      title: "general manager",
      children: [
        { name: "Bo Miao", title: "department manager" },
        {
          name: "Su Miao",
          title: "department manager",
          children: [
            { name: "Tie Hua", title: "senior engineer" },
            {
              name: "Hei Hei",
              title: "senior engineer",
              children: [
                { name: "Pang Pang", title: "engineer" },
                {
                  name: "Dan Dan",
                  title: "UE engineer",
                  children: [
                    { name: "Er Dan", title: "engineer" },
                    {
                      name: "San Dan",
                      title: "engineer",
                      children: [
                        { name: "Si Dan", title: "intern" },
                        { name: "Wu Dan", title: "intern" }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        { name: "Hong Miao", title: "department manager" },
        {
          name: "Chun Miao",
          title: "department manager",
          children: [
            { name: "Bing Qin", title: "senior engineer" },
            {
              name: "Yue Yue",
              title: "senior engineer",
              children: [
                { name: "Er Yue", title: "engineer" },
                { name: "San Yue", title: "UE engineer" }
              ]
            }
          ]
        }
      ]
    };
    document.querySelector("#chart-container").innerHTML = "";
    $("#chart-container").orgchart({
      data: datasource,
      /*nodeContent: "title",*/
      verticalLevel: 3,
      visibleLevel: 4,
      pan: true,
      zoom: true
    });
  });
}
