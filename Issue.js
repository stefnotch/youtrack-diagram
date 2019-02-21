function getIssueField(issue, fieldName) {
  if (!issue) return null;
  if (!issue.field) return null;
  let issueField = issue.field.find(f => f.name == fieldName);
  if (!issueField) return null;
  return issueField.value;
}

class Issue {
  constructor() {
    this.id = "";
    this.name = "";
    this.description = "";
    this.state = "";
    this.type = "";
    this.sprint = "";
    ///** @type {Issue|null} */
    this.parentIssueId = "";
  }

  static fromYoutrackJson(youtrackIssueJson) {
    let newIssue = new Issue();

    // 18_LeoChat-114
    newIssue.id = youtrackIssueJson.id;
    // Leonie Basic Dancing
    newIssue.name = getIssueField(youtrackIssueJson, "summary");
    // Leonie should be able to dance
    newIssue.description = getIssueField(youtrackIssueJson, "description");
    // Done
    newIssue.state = getIssueField(youtrackIssueJson, "State");
    if (newIssue.state) newIssue.state = newIssue.state[0];
    // User Story
    newIssue.type = getIssueField(youtrackIssueJson, "Type");
    if (newIssue.type) newIssue.type = newIssue.type[0];

    // TODO: Chances are that an issue can be in multiple sprints...uh..
    // Initial Sprint
    newIssue.sprint = getIssueField(youtrackIssueJson, "Sprints");
    if (newIssue.sprint) newIssue.sprint = newIssue.sprint[0];

    // subtask of
    let links = getIssueField(youtrackIssueJson, "links");
    newIssue.parentIssueId = links
      ? links.find(l => l.type == "Subtask").value
      : "";

    return newIssue;
  }
}

module.exports = Issue;
