import {
  ReducedAgileImpl,
  ReducedIssueImpl,
  ReducedProjectImpl,
  ReducedUserImpl,
  IssueTagImpl,
  ProjectCustomFieldImpl
} from "youtrack-rest-client";

/**
 *
 * @param {FullIssueImpl} issue
 * @param {string} fieldName
 */
export function getIssueField(issue, fieldName) {
  if (!issue) return null;
  if (!issue.fields) return null;
  let issueField = issue.fields.find(
    f => f.projectCustomField.field.name == fieldName
  );
  if (!issueField) return null;
  return issueField.value.name;
}

export class IssueCustomFieldImpl {
  constructor() {
    this.id = "";
    this.projectCustomField = new ProjectCustomFieldImpl();
    this.value = {
      id: "",
      name: ""
    };
  }
}

export class FullIssueImpl {
  constructor() {
    this.id = "";
    this.numberInProject = 0;
    this.created = 0;
    this.updated = 0;
    this.project = new ReducedProjectImpl();
    this.summary = "";
    this.description = "";
    this.reporter = new ReducedUserImpl();
    this.updater = new ReducedUserImpl();
    this.usesMarkdown = false;
    this.fields = [new IssueCustomFieldImpl()];
    this.isDraft = false;
    this.tags = [new IssueTagImpl()];
    this.parent = {
      direction: "",
      //linkType,
      //issue,
      issues: [{ id: 0 }]
      //trimmedIssues,
    };
  }
}

export class FullSprintImpl {
  constructor() {
    this.id = "";
    this.name = "";
    this.goal = "";
    this.start = 0;
    this.finish = 0;
    this.archived = false;
    this.unresolvedIssuesCount = 0;
    this.previousSprint = undefined;
    this.agile = new ReducedAgileImpl();
    this.isDefault = false;
    this.issues = [new FullIssueImpl()];
  }
}

// WTH, transpilation sucks
/*import { IssueImpl, SprintImpl } from "youtrack-rest-client";

export class FullIssueImpl extends IssueImpl {
  constructor() {
    super(...arguments);
    //https://www.jetbrains.com/help/youtrack/incloud/api-entity-IssueLink.html
    this.parent = {
      direction: "",
      //linkType,
      //issue,
      issues: [{ id: 0 }]
      //trimmedIssues,
    };
  }
}

export class FullSprintImpl extends SprintImpl {
  constructor() {
    super(...arguments);
    this.issues = [new FullIssueImpl()];
  }
}
*/
