// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const Issue = require("./Issue");
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
/**@type {HTMLInputElement} */
const groupByUserStoriesCheckbox = document.getElementById(
  "GroupByUserStoriesCheckbox"
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
          .then(jsonIssues => {
            let datasource = {
              name: selected,
              className: "Sprint"
            };
            let chartSprints = {};

            let issues = jsonIssues
              .map(iss => Issue.fromYoutrackJson(iss))
              .filter(iss => {
                // Optionally ignore user stories
                if (
                  iss.type == "User Story" &&
                  ignoreUserStoriesCheckbox.checked
                ) {
                  return false;
                } else {
                  return true;
                }
              });

            issues.forEach(issue => {
              //console.log(issue);

              //TODO: User stories (See YouTrack - kinda like swimlanes) are usually unfinished, even if all the tasks are done!

              // Add the issue to the sprint's issues
              let chartSprint = getOrCreate(
                chartSprints,
                issue.sprint,
                "Sprint"
              );
              chartSprint.children.push({
                name: issue.name,
                className: issue.state.replace(/\s/g, ""),
                issue: issue
              });
            });

            if (groupByUserStoriesCheckbox.checked) {
              //I've written prettier code
              Object.keys(chartSprints).forEach(key => {
                let chartSprint = chartSprints[key];
                chartSprint.children = chartSprint.children.filter(
                  chartIssue => {
                    let parent = chartSprint.children.find(
                      s => s.issue.id == chartIssue.issue.parentIssueId
                    );

                    if (parent && parent.issue.type == "User Story") {
                      if (!parent.children) {
                        parent.children = [];
                      }
                      parent.children.push(chartIssue);
                      return false;
                    }
                    return true;
                  }
                );
              });
            }

            // Add to thhe datasource
            datasource.children = Object.keys(chartSprints).map(
              iss => chartSprints[iss]
            );
            showChart(datasource);
          });
      });
    });
  });
});

function getOrCreate(chartObject, key, className) {
  if (!chartObject[key]) {
    chartObject[key] = {
      name: key,
      className: className,
      children: []
    };
  }

  return chartObject[key];
}

function showChart(datasource) {
  $(function() {
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
