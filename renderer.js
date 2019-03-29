// @ ts-check
const OAuth = require("./scripts/OAuth");

let test = new OAuth(
  "http://vm81.htl-leonding.ac.at:8080/hub",
  "292dc221-6efa-4519-9de3-59cc86988286",
  "YouTrack"
);
setTimeout(() => test.connect(), 10000);
return;

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const Issue = require("./Issue");
const yt = require("youtrack-rest-client");
//const org = require("orgchart");
const usernameAndPassword = require("./scripts/pw");

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

      youtrackProjectsSelect.addEventListener("change", async ev => {
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
              .map(iss => {
                return Issue.fromYoutrackJson(iss);
              })
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
              let chartSprint = getOrCreateSprint(
                chartSprints,
                issue.sprint,
                "Sprint"
              );
              chartSprint.children.push(orgchartNode(issue));

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
            });

            return datasource;
          })
          .then(datasource => {
            showChart(datasource);
          });
      });
    });
  });
});

function getOrCreateSprint(chartObject, key, className) {
  if (!chartObject[key]) {
    chartObject[key] = {
      name: key,
      className: className,
      children: []
    };
  }

  return chartObject[key];
}

/**
 *
 * @param {Issue} issue
 */
function orgchartNode(issue) {
  return {
    name: issue.name,
    className:
      issue.state.replace(/\s/g, "") + " " + issue.type.replace(/\s/g, ""),
    issue: issue,
    description: issue.description
  };
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
      zoom: true,
      createNode: function($node, data) {
        // https://github.com/dabeng/OrgChart/blob/master/demo/option-createNode.html
        if (data.description) {
          $node.prop("title", data.description);
        }
      }
    });
  });
}
