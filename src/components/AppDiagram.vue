<template>
  <div>
    <div id="chart-container">
      <span class="large-text">No Agile Board Selected</span>
    </div>
  </div>
</template>

<style scoped>
@import "./../scripts/orgchart.css";
@import "./../scripts/orgchart-custom-styles.css";
.large-text {
  font-size: 1.2em;
  margin-left: 12px;
}
</style>

<script>
import OrgChart from "./../scripts/orgchart.js";
import panzoom from "panzoom";

//import OrganizationChart from "vue-organization-chart";
//import "vue-organization-chart/dist/orgchart.css";
import {
  Youtrack,
  IssueImpl,
  IssuePaths,
  Agile,
  SprintPaths,
  SprintImpl
} from "youtrack-rest-client";
import {
  FullIssueImpl,
  FullSprintImpl,
  getIssueField
} from "./../scripts/FullSprint.js";

/**
 * @typedef {{name: string, className: string, issueId: string, sprintId: string, issueParentId: number, description: string, children: any[]}} IssueDatasource
 */

/**
 * @param {any} datasource
 * @param {Youtrack} yt
 * @param {string} agileId
 */
function showChart(datasource, yt, agileId) {
  let baseUrl = yt.baseUrl.replace(/\/api$/i, "");

  document.querySelector("#chart-container").innerHTML = "";
  let orgchart = new OrgChart({
    chartContainer: "#chart-container",
    data: datasource,
    /*nodeContent: "title",*/
    verticalDepth: 3,
    depth: 5,
    //pan: true,
    //zoom: true,
    /**
     * @param {HTMLElement} node
     */
    createNode: function(node, data) {
      // https://github.com/dabeng/OrgChart/blob/master/demo/option-createNode.html
      if (data.description) {
        node.setAttribute("title", data.description);
      }

      if (data.sprintId && data.issueId) {
        let url = `${baseUrl}/agiles/${agileId}/${data.sprintId}?issue=${data.issueId}`;

        let linkElement = document.createElement("a");
        linkElement.target = "_blank";
        linkElement.href = url;
        linkElement.className = "link";
        node.appendChild(linkElement);
      }
    }
  });

  // And make it properly pan & zoomable
  panzoom(orgchart.chart);
}

/**
 * @param {Youtrack} yt
 * @param {string} agileId
 * @param {string} sprintId
 * @returns {Promise<FullSprintImpl>}
 */
function getFullSprintById(yt, agileId, sprintId) {
  return yt.sprints.getResourceWithFields(
    yt.sprints.format(SprintPaths.sprint, { agileId, sprintId }),
    FullSprintImpl
  );
}

export default {
  name: "app-diagram",
  components: {},
  props: ["youtrack", "agileId", "diagramMode"],
  data() {
    return {
      /**@type {Agile} */
      agile: undefined
    };
  },
  watch: {
    agileId: {
      handler: function(value, oldValue) {
        this.displayChart(value, this.diagramMode);
      }
    },
    diagramMode: {
      handler: function(value, oldValue) {
        this.displayChart(this.agileId, value);
      }
    }
  },
  methods: {
    /**
     * @param {String} agileId
     * @param {"sprint"|"epic"} diagramMode
     */
    async displayChart(agileId, diagramMode) {
      /** @type {Youtrack} */
      let yt = this.youtrack;

      let agile = await yt.agiles.byId(agileId);
      this.agile = agile;

      // TODO: If we have more than the default number/limit of issue, we might need to increase the max? options?

      // Agile
      let datasource = {
        name: agile.name,
        className: "Agile",
        children: []
      };

      // Get the full sprints (aka sprint including the issues)
      let fullSprints = await Promise.all(
        agile.sprints.map(sprint => getFullSprintById(yt, agile.id, sprint.id))
      );

      // Sprint Tree (Orgchart)

      if (!diagramMode || diagramMode == "sprint") {
        let sprintDatasources = fullSprints.map(sprint => {
          return {
            name: sprint.name,
            className: "Sprint",
            children: this.getSprintIssueDatasources(sprint, true)
          };
        });

        datasource.children.push(...sprintDatasources);
      } else if (diagramMode == "epic") {
        /** @type {IssueDatasource[]} */
        let issueDatasources = [];
        fullSprints.forEach(sprint =>
          issueDatasources.push(
            ...this.getIssuesDatasources(sprint.id, sprint.issues)
          )
        );

        issueDatasources = this.issueDatasourcesToTree(issueDatasources);
        datasource.children.push(...issueDatasources);
      }

      showChart(datasource, this.youtrack, this.agileId);
    },

    /**
     * @param {FullSprintImpl} sprint
     * @param {boolean} tree Should the issues be in a tree-form
     */
    getSprintIssueDatasources(sprint, tree) {
      let issueDatasources = this.getIssuesDatasources(
        sprint.id,
        sprint.issues
      );
      if (tree) {
        issueDatasources = this.issueDatasourcesToTree(issueDatasources);
      }
      return issueDatasources;
    },

    /**
     * @param {FullIssueImpl[]} issues
     * @param {boolean} tree Should the issues be in a tree-form
     */
    getIssuesDatasources(sprintId, issues) {
      // You got issues...
      let issueDatasources = issues
        .filter(issue => !issue.isDraft) // Remove the drafts
        .map(issue => {
          let issueState = getIssueField(issue, "State").replace(/\s/g, "");
          let issueType = getIssueField(issue, "Type").replace(/\s/g, "");

          // Too bad JS doesn't have a safe navigation operator yet
          let issueParentId = issue.parent.issues
            ? issue.parent.issues[0]
            : undefined;
          issueParentId = issueParentId ? issueParentId.id : undefined;

          // Create the datasource for this issue
          /** @type {IssueDatasource} */
          let issueDatasource = {
            name: issue.summary,
            className: `${issueState} ${issueType}`,
            issueId: issue.id,
            sprintId: sprintId,
            issueParentId: issueParentId,
            description: issue.description,
            children: []
          };
          return issueDatasource;
        });

      return issueDatasources;
    },

    /**
     * @param {IssueDatasource[]} issueDatasources
     */
    issueDatasourcesToTree(issueDatasources) {
      /**@type {Map<string, any>}*/
      let issueMap = new Map();
      issueDatasources.forEach(issueDs =>
        issueMap.set(issueDs.issueId, issueDs)
      );

      // Do the tree thingy
      issueDatasources = issueDatasources.filter(issueDs => {
        let parentDs = issueMap.get(issueDs.issueParentId);
        if (parentDs) {
          // Append this issue to the parent's children
          parentDs.children.push(issueDs);
          return false;
        }
        // Keep this issue around
        return true;
      });

      return issueDatasources;
    }
  }
};
</script>
